const express = require("express");
const router = express.Router();
const { verifyProof } = require("../Services/zkpService");

router.post("/verify", async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
            return res.status(400).json({ error: "Invalid proof structure" });
        }

        if (!publicSignals || !Array.isArray(publicSignals)) {
            return res.status(400).json({ error: "Invalid publicSignals structure" });
        }

        const result = await verifyProof(proof, publicSignals);
        return res.status(200).json({ message: result });
    } catch (error) {
        console.error("Error during proof verification:", error);
        return res.status(500).json({ error: "Verification failed", details: error.message });
    }
});

// router.post("/verify", async (req, res) => {
//     try {
//         const { proof, publicSignals } = req.body;

//         // Call the verification service
//         const result = await verifyProof(proof, publicSignals);
//         return res.status(200).json({ message: result });
//     } catch (error) {
//         console.error("Error during proof verification:", error);
//         return res.status(500).json({ error: "Verification failed" });
//     }
// });

module.exports = router;