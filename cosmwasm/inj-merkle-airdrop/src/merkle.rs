use cosmwasm_std::{Binary, Uint128};
use tiny_keccak::{Hasher, Keccak};

fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    let mut hasher = Keccak::v256();
    hasher.update(data);
    hasher.finalize(&mut out);
    out
}

fn amount_to_bytes32(amount: Uint128) -> [u8; 32] {
    let mut out = [0u8; 32];
    let bytes = amount.u128().to_be_bytes();
    out[24..32].copy_from_slice(&bytes);
    out
}

pub fn leaf_hash(address: &str, amount: Uint128) -> [u8; 32] {
    let mut preimage = Vec::with_capacity(address.len() + 32);
    preimage.extend_from_slice(address.as_bytes());
    preimage.extend_from_slice(&amount_to_bytes32(amount));
    let inner = keccak256(&preimage);
    keccak256(&inner)
}

fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let (a, b) = if left <= right {
        (left, right)
    } else {
        (right, left)
    };
    let mut data = [0u8; 64];
    data[..32].copy_from_slice(a);
    data[32..].copy_from_slice(b);
    keccak256(&data)
}

pub fn verify(proof: &[Binary], root: &[u8], leaf: [u8; 32]) -> bool {
    if root.len() != 32 {
        return false;
    }

    let mut computed = leaf;
    for step in proof {
        if step.len() != 32 {
            return false;
        }
        let mut sibling = [0u8; 32];
        sibling.copy_from_slice(step.as_slice());
        computed = hash_pair(&computed, &sibling);
    }

    computed.as_slice() == root
}