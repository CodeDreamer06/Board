use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardSummary {
    pub id: String,
    pub name: String,
    pub updated_at: i64,
    pub created_at: i64,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.initialize_schema()?;
        Ok(db)
    }

    #[allow(dead_code)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database { conn };
        db.initialize_schema()?;
        Ok(db)
    }

    fn initialize_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL
            );"
        )?;
        Ok(())
    }

    fn now_ts() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }

    pub fn save_board(&self, id: &str, name: &str, data: &str) -> Result<()> {
        let now = Self::now_ts();
        self.conn.execute(
            "INSERT INTO boards (id, name, data, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               data = excluded.data,
               updated_at = excluded.updated_at",
            params![id, name, data, now, now],
        )?;
        Ok(())
    }

    pub fn get_board(&self, id: &str) -> Result<Option<(String, String)>> {
        let mut stmt = self.conn.prepare("SELECT name, data FROM boards WHERE id = ?1")?;
        let mut rows = stmt.query([id])?;
        if let Some(row) = rows.next()? {
            let name: String = row.get(0)?;
            let data: String = row.get(1)?;
            Ok(Some((name, data)))
        } else {
            Ok(None)
        }
    }

    pub fn list_boards(&self) -> Result<Vec<BoardSummary>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, updated_at, created_at FROM boards ORDER BY updated_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(BoardSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                updated_at: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?;
        let mut boards = Vec::new();
        for row in rows {
            boards.push(row?);
        }
        Ok(boards)
    }

    pub fn delete_board(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM boards WHERE id = ?1", [id])?;
        Ok(())
    }
}
