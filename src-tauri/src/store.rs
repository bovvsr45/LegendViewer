//! On-disk state: folders, connections and settings in one JSON document.
//! Passwords are never written in the clear -- see `crypto`.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn default_port() -> u16 {
    5900
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub folder_id: Option<String>,
    /// Required by macOS Screen Sharing (ARD auth) and VeNCrypt/Plain servers.
    #[serde(default)]
    pub username: Option<String>,
    /// base64(nonce || AES-256-GCM ciphertext); never leaves the backend.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password_enc: Option<String>,
    #[serde(default)]
    pub view_only: bool,
    #[serde(default)]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// "dark" | "light" | "system"
    pub theme: String,
    /// Thumbnail refresh period in seconds; 0 disables capture entirely.
    pub thumbnail_interval: u32,
    pub default_port: u16,
    #[serde(default = "def_true")]
    pub scale_viewer: bool,
}

fn def_true() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            thumbnail_interval: 30,
            default_port: 5900,
            scale_viewer: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Db {
    #[serde(default)]
    pub folders: Vec<Folder>,
    #[serde(default)]
    pub connections: Vec<Connection>,
    #[serde(default)]
    pub settings: Settings,
}

pub struct Store {
    pub path: PathBuf,
    pub db: Db,
}

impl Store {
    pub fn load(path: PathBuf) -> Self {
        let db = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<Db>(&s).ok())
            .unwrap_or_default();
        Store { path, db }
    }

    pub fn save(&self) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(&self.db)?)?;
        fs::rename(&tmp, &self.path)?;
        Ok(())
    }
}
