//! Minimal RFB (VNC) client used only for background thumbnail capture.
//!
//! Scope on purpose: handshake + VNC auth + a single full-screen Raw-encoded
//! framebuffer update. Raw is mandatory in the RFB spec, so every server
//! supports it. Interactive sessions never go through here -- they are piped
//! straight to noVNC by `proxy.rs`, which speaks every encoding the server has.

use anyhow::{anyhow, bail, Result};
use cipher::{BlockEncrypt, KeyInit};
use des::Des;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// How many times to re-ask for the screen when the server hands back a
/// completely black frame.
const MAX_CAPTURE_ATTEMPTS: u32 = 3;

pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    /// RGBA8 pixels, `width * height * 4` bytes.
    pub rgba: Vec<u8>,
}

pub struct RfbClient {
    stream: TcpStream,
    pub width: u16,
    pub height: u16,
}

impl RfbClient {
    pub async fn connect(host: &str, port: u16, password: Option<&str>) -> Result<Self> {
        let stream = tokio::time::timeout(
            Duration::from_secs(6),
            TcpStream::connect((host, port)),
        )
        .await
        .map_err(|_| anyhow!("connection timed out"))??;
        stream.set_nodelay(true).ok();

        let mut c = RfbClient { stream, width: 0, height: 0 };
        c.handshake(password).await?;
        Ok(c)
    }

    async fn handshake(&mut self, password: Option<&str>) -> Result<()> {
        // --- ProtocolVersion ---
        let mut ver = [0u8; 12];
        self.stream.read_exact(&mut ver).await?;
        if &ver[0..4] != b"RFB " {
            bail!("not an RFB server");
        }
        let server_minor: u32 = std::str::from_utf8(&ver[8..11])?.parse().unwrap_or(3);
        // Never claim a version newer than the server's.
        let minor = if server_minor >= 8 {
            8
        } else if server_minor == 7 {
            7
        } else {
            3
        };
        let use_37 = minor >= 7;
        self.stream
            .write_all(match minor {
                8 => b"RFB 003.008\n",
                7 => b"RFB 003.007\n",
                _ => b"RFB 003.003\n",
            })
            .await?;

        // --- Security ---
        let sec_type: u8 = if use_37 {
            let n = self.stream.read_u8().await?;
            if n == 0 {
                let len = self.stream.read_u32().await? as usize;
                let mut msg = vec![0u8; len];
                self.stream.read_exact(&mut msg).await?;
                bail!("server rejected connection: {}", String::from_utf8_lossy(&msg));
            }
            let mut types = vec![0u8; n as usize];
            self.stream.read_exact(&mut types).await?;
            if password.is_some() && types.contains(&2) {
                2
            } else if types.contains(&1) {
                1
            } else if types.contains(&2) {
                2
            } else {
                bail!("no supported security type (server offered {:?})", types);
            }
        } else {
            let t = self.stream.read_u32().await?;
            if t == 0 {
                bail!("server rejected connection");
            }
            t as u8
        };
        if use_37 {
            self.stream.write_u8(sec_type).await?;
        }

        if sec_type == 2 {
            let pw = password.ok_or_else(|| anyhow!("this server requires a password"))?;
            let mut challenge = [0u8; 16];
            self.stream.read_exact(&mut challenge).await?;
            let response = vnc_des(pw, &challenge);
            self.stream.write_all(&response).await?;
        }

        // SecurityResult: always present in 3.8; in 3.3 only after VNC auth.
        if minor >= 8 || sec_type == 2 {
            let result = self.stream.read_u32().await?;
            if result != 0 {
                if minor >= 8 {
                    let len = self.stream.read_u32().await.unwrap_or(0) as usize;
                    let mut msg = vec![0u8; len.min(1024)];
                    let _ = self.stream.read_exact(&mut msg).await;
                    bail!("authentication failed: {}", String::from_utf8_lossy(&msg));
                }
                bail!("authentication failed");
            }
        }

        // --- ClientInit (shared = 1) / ServerInit ---
        self.stream.write_u8(1).await?;
        self.width = self.stream.read_u16().await?;
        self.height = self.stream.read_u16().await?;
        let mut pf = [0u8; 16];
        self.stream.read_exact(&mut pf).await?;
        let name_len = self.stream.read_u32().await? as usize;
        let mut name = vec![0u8; name_len.min(4096)];
        self.stream.read_exact(&mut name).await?;
        let _ = (pf, name);

        if self.width == 0 || self.height == 0 {
            bail!("server reported an empty framebuffer");
        }
        Ok(())
    }

    /// Pin the wire format to 32bpp little-endian BGRX and Raw encoding so the
    /// decode path below stays a memcpy.
    async fn set_format(&mut self) -> Result<()> {
        let mut msg = vec![0u8; 20];
        msg[0] = 0; // SetPixelFormat
        msg[4] = 32; // bits-per-pixel
        msg[5] = 24; // depth
        msg[6] = 0; // big-endian-flag
        msg[7] = 1; // true-colour-flag
        msg[8..10].copy_from_slice(&255u16.to_be_bytes()); // red-max
        msg[10..12].copy_from_slice(&255u16.to_be_bytes()); // green-max
        msg[12..14].copy_from_slice(&255u16.to_be_bytes()); // blue-max
        msg[14] = 16; // red-shift
        msg[15] = 8; // green-shift
        msg[16] = 0; // blue-shift
        self.stream.write_all(&msg).await?;

        // SetEncodings: Raw(0) only.
        let mut enc = vec![2u8, 0, 0, 1];
        enc.extend_from_slice(&0i32.to_be_bytes());
        self.stream.write_all(&enc).await?;
        Ok(())
    }

    async fn request_full_update(&mut self) -> Result<()> {
        let mut req = vec![3u8, 0];
        req.extend_from_slice(&0u16.to_be_bytes()); // x
        req.extend_from_slice(&0u16.to_be_bytes()); // y
        req.extend_from_slice(&self.width.to_be_bytes());
        req.extend_from_slice(&self.height.to_be_bytes());
        self.stream.write_all(&req).await?;
        Ok(())
    }

    /// Grab one full-screen frame.
    ///
    /// Several Windows servers (TightVNC / UltraVNC in particular) answer the
    /// *first* FramebufferUpdateRequest after connect out of a framebuffer they
    /// have not filled in yet, which is why a one-shot capture can come back
    /// pure black while an interactive client -- which keeps requesting updates
    /// forever -- looks fine. So: ask again if what we got is entirely black.
    pub async fn capture(&mut self) -> Result<Framebuffer> {
        self.set_format().await?;

        let (w, h) = (self.width as u32, self.height as u32);
        let mut rgba = vec![0u8; (w * h * 4) as usize];
        let deadline = tokio::time::Instant::now() + Duration::from_secs(25);

        let mut black = true;
        for attempt in 0..MAX_CAPTURE_ATTEMPTS {
            self.request_full_update().await?;
            let covered = self.read_frame(&mut rgba, w, h, deadline).await?;

            if covered == 0 {
                bail!("server accepted the connection but sent no image data");
            }
            black = is_all_black(&rgba);
            if !black {
                break;
            }
            if attempt + 1 < MAX_CAPTURE_ATTEMPTS {
                // Give the server a beat to actually paint its framebuffer.
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }

        if black {
            // Surfacing this beats showing an indistinguishable black card.
            bail!("원격 화면이 검은색으로만 전송됩니다 (모니터 꺼짐/잠금 화면이거나, 서버가 세션 화면을 캡처하지 못하는 상태)");
        }

        Ok(Framebuffer { width: w, height: h, rgba })
    }

    /// Reads server messages until the framebuffer is fully covered (or the
    /// server signals LastRect). Returns how many pixels were written.
    async fn read_frame(
        &mut self,
        rgba: &mut [u8],
        w: u32,
        h: u32,
        deadline: tokio::time::Instant,
    ) -> Result<u64> {
        let target = w as u64 * h as u64;
        let mut covered: u64 = 0;

        while covered < target {
            let msg_type = tokio::time::timeout_at(deadline, self.stream.read_u8())
                .await
                .map_err(|_| anyhow!("timed out waiting for a framebuffer update"))??;

            match msg_type {
                0 => {
                    let _pad = self.stream.read_u8().await?;
                    let rects = self.stream.read_u16().await?;
                    let mut last_rect = false;

                    for _ in 0..rects {
                        let rx = self.stream.read_u16().await? as u32;
                        let ry = self.stream.read_u16().await? as u32;
                        let rw = self.stream.read_u16().await? as u32;
                        let rh = self.stream.read_u16().await? as u32;
                        let enc = self.stream.read_i32().await?;

                        match enc {
                            // Raw
                            0 => {
                                let mut row = vec![0u8; (rw * 4) as usize];
                                for y in 0..rh {
                                    self.stream.read_exact(&mut row).await?;
                                    let dy = ry + y;
                                    if dy >= h {
                                        continue;
                                    }
                                    for x in 0..rw {
                                        let dx = rx + x;
                                        if dx >= w {
                                            continue;
                                        }
                                        let s = (x * 4) as usize;
                                        let d = ((dy * w + dx) * 4) as usize;
                                        // wire is little-endian BGRX
                                        rgba[d] = row[s + 2];
                                        rgba[d + 1] = row[s + 1];
                                        rgba[d + 2] = row[s];
                                        rgba[d + 3] = 255;
                                    }
                                }
                                covered += rw as u64 * rh as u64;
                            }
                            // CopyRect: src-x, src-y then a blit
                            1 => {
                                let sx = self.stream.read_u16().await? as u32;
                                let sy = self.stream.read_u16().await? as u32;
                                copy_rect(rgba, w, h, sx, sy, rx, ry, rw, rh);
                                covered += rw as u64 * rh as u64;
                            }
                            // LastRect: server is done, count unknown up front
                            -224 => last_rect = true,
                            // DesktopSize / Cursor / PointerPos pseudo-encodings
                            -223 | -232 | -239 => {}
                            other => bail!("server used unsupported encoding {other}"),
                        }
                    }

                    if last_rect {
                        break;
                    }
                    // A server that answers with nothing has nothing more to say.
                    if rects == 0 {
                        break;
                    }
                }
                1 => {
                    // SetColourMapEntries
                    let _ = self.stream.read_u8().await?;
                    let _first = self.stream.read_u16().await?;
                    let n = self.stream.read_u16().await? as usize;
                    let mut skip = vec![0u8; n * 6];
                    self.stream.read_exact(&mut skip).await?;
                }
                2 => { /* Bell */ }
                3 => {
                    // ServerCutText
                    let mut pad = [0u8; 3];
                    self.stream.read_exact(&mut pad).await?;
                    let len = self.stream.read_u32().await? as usize;
                    let mut skip = vec![0u8; len.min(1 << 20)];
                    self.stream.read_exact(&mut skip).await?;
                }
                other => bail!("unexpected server message type {other}"),
            }
        }

        Ok(covered)
    }
}

/// True when every pixel is pure black -- the signature of a framebuffer the
/// server has not painted yet.
fn is_all_black(rgba: &[u8]) -> bool {
    rgba.chunks_exact(4).all(|p| p[0] == 0 && p[1] == 0 && p[2] == 0)
}

fn copy_rect(
    rgba: &mut [u8],
    w: u32,
    h: u32,
    sx: u32,
    sy: u32,
    dx0: u32,
    dy0: u32,
    rw: u32,
    rh: u32,
) {
    // Copy bottom-up / right-to-left when the regions overlap in that direction.
    let rows: Vec<u32> = if sy < dy0 { (0..rh).rev().collect() } else { (0..rh).collect() };
    let cols: Vec<u32> = if sx < dx0 { (0..rw).rev().collect() } else { (0..rw).collect() };

    for &y in &rows {
        for &x in &cols {
            let (sxx, syy, dxx, dyy) = (sx + x, sy + y, dx0 + x, dy0 + y);
            if sxx >= w || syy >= h || dxx >= w || dyy >= h {
                continue;
            }
            let s = ((syy * w + sxx) * 4) as usize;
            let d = ((dyy * w + dxx) * 4) as usize;
            let px = [rgba[s], rgba[s + 1], rgba[s + 2], rgba[s + 3]];
            rgba[d..d + 4].copy_from_slice(&px);
        }
    }
}

/// VNC's variant of DES: the 8-byte key is the password, right-padded with
/// zeros, with the bit order of every byte reversed.
fn vnc_des(password: &str, challenge: &[u8; 16]) -> [u8; 16] {
    let mut key = [0u8; 8];
    for (i, b) in password.bytes().take(8).enumerate() {
        key[i] = b.reverse_bits();
    }
    let des = Des::new(&key.into());
    let mut out = [0u8; 16];
    out.copy_from_slice(challenge);
    for chunk in out.chunks_mut(8) {
        let mut raw = [0u8; 8];
        raw.copy_from_slice(chunk);
        let mut block = cipher::Block::<Des>::from(raw);
        des.encrypt_block(&mut block);
        chunk.copy_from_slice(&block);
    }
    out
}
