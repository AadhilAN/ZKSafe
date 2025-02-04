const snarkjs = require("snarkjs");
const verificationKey = require("../compiled/verification_key.json");

async function verifyProof(proof, publicSignals) {
    const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
    return isValid ? "Proof is valid" : "Proof is invalid";
}

module.exports = { verifyProof };