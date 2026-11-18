//! Local-at-rest encryption for stored VNC passwords.
//!
//! A random 256-bit key is generated on first launch and kept in `key.bin`
//! inside the app data directory. Passwords are sealed with AES-256-GCM and a
//! fresh random 96-bit nonce, stored as base64(nonce || ciphertext).

use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use std::fs;
use std::path::Path;

pub fn load_or_create_key(path: &Path) -> Result<[u8; 32]> {
    if let Ok(bytes) = fs::read(path) {
        if bytes.len() == 32 {
            let mut k = [0u8; 32];
            k.copy_from_slice(&bytes);
            return Ok(k);
        }
    }
    let mut k = [0u8; 32];
    OsRng.fill_bytes(&mut k);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, k)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    }
    Ok(k)
}

pub fn encrypt(key: &[u8; 32], plain: &str) -> Result<String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(nonce, plain.as_bytes())
        .map_err(|_| anyhow!("encryption failed"))?;
    let mut out = nonce_bytes.to_vec();
    out.extend_from_slice(&ct);
    Ok(B64.encode(out))
}

pub fn decrypt(key: &[u8; 32], sealed: &str) -> Result<String> {
    let raw = B64.decode(sealed)?;
    if raw.len() < 13 {
        return Err(anyhow!("sealed blob too short"));
    }
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let plain = cipher
        .decrypt(Nonce::from_slice(&raw[..12]), &raw[12..])
        .map_err(|_| anyhow!("decryption failed"))?;
    Ok(String::from_utf8(plain)?)
}
