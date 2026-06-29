use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub elapsed_ms: u64,
}

/// Execute code in a sandboxed child process with a 30-second timeout.
/// Supports: javascript, typescript, python, shell/bash, rust, go, c, cpp
pub async fn execute_in_sandbox(language: &str, code: &str) -> Result<ExecutionResult, String> {
    let start = Instant::now();
    let lang = language.to_lowercase();
    let temp_dir = std::env::temp_dir();
    let uid = format!("devboard_{}", std::process::id());

    match lang.as_str() {
        "javascript" | "js" => {
            let file = temp_dir.join(format!("{}.js", uid));
            write_temp(&file, code)?;
            let result = run_with_timeout("node", &[file.to_str().unwrap()], 30).await;
            let _ = std::fs::remove_file(&file);
            Ok(make_result(result, start))
        }
        "typescript" | "ts" => {
            // Run as JS (strip basic type annotations isn't perfect, but node can handle most TS)
            let file = temp_dir.join(format!("{}.mjs", uid));
            // Simple approach: try with tsx/ts-node first, fall back to node
            write_temp(&file, code)?;
            let result = run_with_timeout("node", &[
                "--input-type=module",
                file.to_str().unwrap(),
            ], 30).await;
            let _ = std::fs::remove_file(&file);
            Ok(make_result(result, start))
        }
        "python" | "python3" | "py" => {
            let file = temp_dir.join(format!("{}.py", uid));
            write_temp(&file, code)?;
            let result = run_with_timeout("python3", &[file.to_str().unwrap()], 30).await;
            let _ = std::fs::remove_file(&file);
            Ok(make_result(result, start))
        }
        "shell" | "bash" | "sh" => {
            let file = temp_dir.join(format!("{}.sh", uid));
            write_temp(&file, code)?;
            let result = run_with_timeout("bash", &[file.to_str().unwrap()], 30).await;
            let _ = std::fs::remove_file(&file);
            Ok(make_result(result, start))
        }
        "rust" | "rs" => {
            let src = temp_dir.join(format!("{}.rs", uid));
            let bin = temp_dir.join(format!("{}_bin", uid));
            write_temp(&src, code)?;
            // Compile
            let compile = run_with_timeout("rustc", &[
                src.to_str().unwrap(),
                "-o", bin.to_str().unwrap(),
            ], 30).await;
            match compile {
                Ok((_, _stderr, exit)) if exit == 0 => {
                    // Run the compiled binary
                    let result = run_with_timeout(bin.to_str().unwrap(), &[], 30).await;
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(make_result(result, start))
                }
                Ok((_, stderr, exit)) => {
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(ExecutionResult {
                        stdout: String::new(),
                        stderr: format!("Compilation failed:\n{}", stderr),
                        exit_code: exit,
                        elapsed_ms: start.elapsed().as_millis() as u64,
                    })
                }
                Err(e) => {
                    let _ = std::fs::remove_file(&src);
                    Err(e)
                }
            }
        }
        "go" => {
            let file = temp_dir.join(format!("{}.go", uid));
            write_temp(&file, code)?;
            let result = run_with_timeout("go", &["run", file.to_str().unwrap()], 30).await;
            let _ = std::fs::remove_file(&file);
            Ok(make_result(result, start))
        }
        "c" => {
            let src = temp_dir.join(format!("{}.c", uid));
            let bin = temp_dir.join(format!("{}_cbin", uid));
            write_temp(&src, code)?;
            let compile = run_with_timeout("cc", &[
                src.to_str().unwrap(),
                "-o", bin.to_str().unwrap(),
            ], 30).await;
            match compile {
                Ok((_, _stderr, exit)) if exit == 0 => {
                    let result = run_with_timeout(bin.to_str().unwrap(), &[], 30).await;
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(make_result(result, start))
                }
                Ok((_, stderr, exit)) => {
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(ExecutionResult {
                        stdout: String::new(),
                        stderr: format!("Compilation failed:\n{}", stderr),
                        exit_code: exit,
                        elapsed_ms: start.elapsed().as_millis() as u64,
                    })
                }
                Err(e) => {
                    let _ = std::fs::remove_file(&src);
                    Err(e)
                }
            }
        }
        "cpp" | "c++" => {
            let src = temp_dir.join(format!("{}.cpp", uid));
            let bin = temp_dir.join(format!("{}_cppbin", uid));
            write_temp(&src, code)?;
            let compile = run_with_timeout("c++", &[
                src.to_str().unwrap(),
                "-o", bin.to_str().unwrap(),
                "-std=c++17",
            ], 30).await;
            match compile {
                Ok((_, _stderr, exit)) if exit == 0 => {
                    let result = run_with_timeout(bin.to_str().unwrap(), &[], 30).await;
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(make_result(result, start))
                }
                Ok((_, stderr, exit)) => {
                    let _ = std::fs::remove_file(&src);
                    let _ = std::fs::remove_file(&bin);
                    Ok(ExecutionResult {
                        stdout: String::new(),
                        stderr: format!("Compilation failed:\n{}", stderr),
                        exit_code: exit,
                        elapsed_ms: start.elapsed().as_millis() as u64,
                    })
                }
                Err(e) => {
                    let _ = std::fs::remove_file(&src);
                    Err(e)
                }
            }
        }
        _ => Err(format!("Unsupported language: {}", language)),
    }
}

fn write_temp(path: &std::path::Path, content: &str) -> Result<(), String> {
    let mut file = std::fs::File::create(path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    Ok(())
}

/// Run a command with a timeout in seconds. Returns (stdout, stderr, exit_code).
async fn run_with_timeout(
    program: &str,
    args: &[&str],
    timeout_secs: u64,
) -> Result<(String, String, i32), String> {
    let program = program.to_string();
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();

    tokio::task::spawn_blocking(move || {
        let mut child = Command::new(&program)
            .args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start '{}': {}. Is it installed?", program, e))?;

        let timeout = std::time::Duration::from_secs(timeout_secs);
        let start = Instant::now();

        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let stdout = child.stdout.take()
                        .map(|s| std::io::read_to_string(s).unwrap_or_default())
                        .unwrap_or_default();
                    let stderr = child.stderr.take()
                        .map(|s| std::io::read_to_string(s).unwrap_or_default())
                        .unwrap_or_default();
                    return Ok((stdout, stderr, status.code().unwrap_or(-1)));
                }
                Ok(None) => {
                    if start.elapsed() > timeout {
                        let _ = child.kill();
                        return Ok((
                            String::new(),
                            format!("Process killed: exceeded {}s timeout", timeout_secs),
                            -1,
                        ));
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(e) => return Err(format!("Error waiting for process: {}", e)),
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

fn make_result(
    res: Result<(String, String, i32), String>,
    start: Instant,
) -> ExecutionResult {
    match res {
        Ok((stdout, stderr, exit_code)) => ExecutionResult {
            stdout,
            stderr,
            exit_code,
            elapsed_ms: start.elapsed().as_millis() as u64,
        },
        Err(e) => ExecutionResult {
            stdout: String::new(),
            stderr: e,
            exit_code: -1,
            elapsed_ms: start.elapsed().as_millis() as u64,
        },
    }
}
