mod crypto;
mod proxy;
mod rfb;
mod store;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::PathBuf;
use store::{Connection, Db, Folder, Settings, Store};
use tauri::{Manager, State};

/// Longest edge of a generated preview thumbnail, in pixels.
const THUMB_MAX_EDGE: u32 = 480;

pub struct AppState {
    store: Mutex<Store>,
    key: [u8; 32],
    sessions: proxy::Sessions,
    ws_port: Mutex<u16>,
}

// ---------------------------------------------------------------- payloads

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionView {
    id: String,
    name: String,
    host: String,
    port: u16,
    folder_id: Option<String>,
    username: Option<String>,
    has_password: bool,
    view_only: bool,
    created_at: i64,
}

impl From<&Connection> for ConnectionView {
    fn from(c: &Connection) -> Self {
        Self {
            id: c.id.clone(),
            name: c.name.clone(),
            host: c.host.clone(),
            port: c.port,
            folder_id: c.folder_id.clone(),
            username: c.username.clone(),
            has_password: c.password_enc.is_some(),
            view_only: c.view_only,
            created_at: c.created_at,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatePayload {
    folders: Vec<Folder>,
    connections: Vec<ConnectionView>,
    settings: Settings,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    id: Option<String>,
    name: String,
    host: String,
    port: u16,
    folder_id: Option<String>,
    #[serde(default)]
    username: Option<String>,
    /// `None` keeps the stored password, `Some("")` clears it.
    password: Option<String>,
    #[serde(default)]
    view_only: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    ws_port: u16,
    token: String,
    username: Option<String>,
    password: Option<String>,
    view_only: bool,
    name: String,
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn snapshot(db: &Db) -> StatePayload {
    StatePayload {
        folders: db.folders.clone(),
        connections: db.connections.iter().map(ConnectionView::from).collect(),
        settings: db.settings.clone(),
    }
}

// ---------------------------------------------------------------- commands

#[tauri::command]
fn get_state(state: State<'_, AppState>) -> StatePayload {
    snapshot(&state.store.lock().db)
}

#[tauri::command]
fn upsert_connection(
    input: ConnectionInput,
    state: State<'_, AppState>,
) -> Result<StatePayload, String> {
    let mut store = state.store.lock();

    let password_enc = match input.password.as_deref() {
        None => None,
        Some("") => Some(None),
        Some(p) => Some(Some(crypto::encrypt(&state.key, p).map_err(|e| e.to_string())?)),
    };

    let existing = input
        .id
        .as_ref()
        .and_then(|id| store.db.connections.iter().position(|c| &c.id == id));

    match existing {
        Some(idx) => {
            let c = &mut store.db.connections[idx];
            c.name = input.name;
            c.host = input.host;
            c.port = input.port;
            c.folder_id = input.folder_id;
            c.username = input.username.filter(|u| !u.is_empty());
            c.view_only = input.view_only;
            if let Some(enc) = password_enc {
                c.password_enc = enc;
            }
        }
        None => store.db.connections.push(Connection {
            id: uuid::Uuid::new_v4().to_string(),
            name: input.name,
            host: input.host,
            port: input.port,
            folder_id: input.folder_id,
            username: input.username.filter(|u| !u.is_empty()),
            password_enc: password_enc.flatten(),
            view_only: input.view_only,
            created_at: now_ms(),
        }),
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(snapshot(&store.db))
}

#[tauri::command]
fn delete_connection(id: String, state: State<'_, AppState>) -> Result<StatePayload, String> {
    let mut store = state.store.lock();
    store.db.connections.retain(|c| c.id != id);
    store.save().map_err(|e| e.to_string())?;
    Ok(snapshot(&store.db))
}

#[tauri::command]
fn upsert_folder(
    id: Option<String>,
    name: String,
    parent_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<StatePayload, String> {
    let mut store = state.store.lock();
    match id.and_then(|id| store.db.folders.iter().position(|f| f.id == id)) {
        Some(idx) => {
            store.db.folders[idx].name = name;
            store.db.folders[idx].parent_id = parent_id;
        }
        None => store.db.folders.push(Folder {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            parent_id,
        }),
    }
    store.save().map_err(|e| e.to_string())?;
    Ok(snapshot(&store.db))
}

/// Deletes a folder and every descendant; connections inside move to the root.
#[tauri::command]
fn delete_folder(id: String, state: State<'_, AppState>) -> Result<StatePayload, String> {
    let mut store = state.store.lock();

    let mut doomed = vec![id.clone()];
    let mut i = 0;
    while i < doomed.len() {
        let current = doomed[i].clone();
        for f in &store.db.folders {
            if f.parent_id.as_deref() == Some(current.as_str()) && !doomed.contains(&f.id) {
                doomed.push(f.id.clone());
            }
        }
        i += 1;
    }

    store.db.folders.retain(|f| !doomed.contains(&f.id));
    for c in &mut store.db.connections {
        if c.folder_id.as_ref().is_some_and(|fid| doomed.contains(fid)) {
            c.folder_id = None;
        }
    }
    store.save().map_err(|e| e.to_string())?;
    Ok(snapshot(&store.db))
}

#[tauri::command]
fn update_settings(settings: Settings, state: State<'_, AppState>) -> Result<StatePayload, String> {
    let mut store = state.store.lock();
    store.db.settings = settings;
    store.save().map_err(|e| e.to_string())?;
    Ok(snapshot(&store.db))
}

/// Connects, grabs one frame, downscales it and hands back a PNG data URL.
#[tauri::command]
async fn capture_thumbnail(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let (host, port, password) = {
        let store = state.store.lock();
        let c = store
            .db
            .connections
            .iter()
            .find(|c| c.id == id)
            .ok_or("connection not found")?;
        let pw = c
            .password_enc
            .as_ref()
            .and_then(|e| crypto::decrypt(&state.key, e).ok());
        (c.host.clone(), c.port, pw)
    };

    let mut client = rfb::RfbClient::connect(&host, port, password.as_deref())
        .await
        .map_err(|e| e.to_string())?;
    let fb = client.capture().await.map_err(|e| e.to_string())?;

    let img = image::RgbaImage::from_raw(fb.width, fb.height, fb.rgba)
        .ok_or("malformed framebuffer")?;
    let scale = (THUMB_MAX_EDGE as f32 / fb.width.max(fb.height) as f32).min(1.0);
    let (tw, th) = (
        ((fb.width as f32 * scale) as u32).max(1),
        ((fb.height as f32 * scale) as u32).max(1),
    );
    let small = image::imageops::resize(&img, tw, th, image::imageops::FilterType::Triangle);

    let mut buf = Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(small)
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(format!("data:image/png;base64,{}", B64.encode(buf.into_inner())))
}

/// Registers a one-shot bridge token for the interactive viewer.
#[tauri::command]
fn open_session(id: String, state: State<'_, AppState>) -> Result<SessionInfo, String> {
    let store = state.store.lock();
    let c = store
        .db
        .connections
        .iter()
        .find(|c| c.id == id)
        .ok_or("connection not found")?;

    let token = uuid::Uuid::new_v4().to_string();
    state.sessions.insert(
        token.clone(),
        proxy::Target {
            host: c.host.clone(),
            port: c.port,
        },
    );

    Ok(SessionInfo {
        ws_port: *state.ws_port.lock(),
        token,
        username: c.username.clone(),
        password: c
            .password_enc
            .as_ref()
            .and_then(|e| crypto::decrypt(&state.key, e).ok()),
        view_only: c.view_only,
        name: c.name.clone(),
    })
}

#[tauri::command]
fn close_session(token: String, state: State<'_, AppState>) {
    state.sessions.remove(&token);
}

// ---------------------------------------------------------------- bootstrap

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir: PathBuf = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir).ok();

            let key = crypto::load_or_create_key(&dir.join("key.bin"))?;
            let store = Store::load(dir.join("data.json"));
            let sessions = proxy::Sessions::default();

            app.manage(AppState {
                store: Mutex::new(store),
                key,
                sessions: sessions.clone(),
                ws_port: Mutex::new(0),
            });

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match proxy::serve(sessions).await {
                    Ok(port) => *handle.state::<AppState>().ws_port.lock() = port,
                    Err(e) => eprintln!("[proxy] failed to start: {e}"),
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            upsert_connection,
            delete_connection,
            upsert_folder,
            delete_folder,
            update_settings,
            capture_thumbnail,
            open_session,
            close_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running LegendViewer");
}
