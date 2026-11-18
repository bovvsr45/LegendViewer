//! WebSocket <-> TCP bridge.
//!
//! A WebView cannot open a raw TCP socket, so the interactive viewer runs
//! noVNC in the frontend and this loopback-only bridge carries the RFB stream
//! byte-for-byte. Nothing is parsed here, which means every encoding the
//! server and noVNC agree on (Tight, ZRLE, H.264...) just works.

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::tungstenite::http::{header::SEC_WEBSOCKET_PROTOCOL, HeaderValue};
use tokio_tungstenite::tungstenite::Message;

#[derive(Clone)]
pub struct Target {
    pub host: String,
    pub port: u16,
}

#[derive(Clone, Default)]
pub struct Sessions(Arc<Mutex<HashMap<String, Target>>>);

impl Sessions {
    pub fn insert(&self, token: String, target: Target) {
        self.0.lock().insert(token, target);
    }
    pub fn take(&self, token: &str) -> Option<Target> {
        self.0.lock().remove(token)
    }
    pub fn remove(&self, token: &str) {
        self.0.lock().remove(token);
    }
}

/// Binds an ephemeral loopback port and serves the bridge forever.
pub async fn serve(sessions: Sessions) -> Result<u16> {
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let sessions = sessions.clone();
            tokio::spawn(async move {
                if let Err(e) = handle(stream, sessions).await {
                    eprintln!("[proxy] session ended: {e}");
                }
            });
        }
    });

    Ok(port)
}

async fn handle(stream: TcpStream, sessions: Sessions) -> Result<()> {
    let path = Arc::new(Mutex::new(String::new()));
    let captured = path.clone();

    let ws = tokio_tungstenite::accept_hdr_async(
        stream,
        move |req: &Request, mut res: Response| {
            *captured.lock() = req.uri().path().trim_start_matches('/').to_string();
            // noVNC historically asks for the `binary` subprotocol.
            if let Some(v) = req.headers().get(SEC_WEBSOCKET_PROTOCOL) {
                if v.to_str().unwrap_or("").contains("binary") {
                    res.headers_mut()
                        .insert(SEC_WEBSOCKET_PROTOCOL, HeaderValue::from_static("binary"));
                }
            }
            Ok(res)
        },
    )
    .await?;

    let token = path.lock().clone();
    let target = sessions
        .take(&token)
        .ok_or_else(|| anyhow::anyhow!("unknown or already-consumed session token"))?;

    let tcp = TcpStream::connect((target.host.as_str(), target.port)).await?;
    tcp.set_nodelay(true).ok();
    let (mut tcp_r, mut tcp_w) = tcp.into_split();
    let (mut ws_w, mut ws_r) = ws.split();

    // browser -> server
    let up = async move {
        while let Some(msg) = ws_r.next().await {
            match msg {
                Ok(Message::Binary(b)) => {
                    if tcp_w.write_all(&b).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
        let _ = tcp_w.shutdown().await;
    };

    // server -> browser
    let down = async move {
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            match tcp_r.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    if ws_w.send(Message::Binary(buf[..n].to_vec())).await.is_err() {
                        break;
                    }
                }
            }
        }
        let _ = ws_w.close().await;
    };

    tokio::select! {
        _ = up => {},
        _ = down => {},
    }
    Ok(())
}
