use sha2::{Sha256, Digest};

pub fn hash_identifier(input: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hasher.update(salt.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}
