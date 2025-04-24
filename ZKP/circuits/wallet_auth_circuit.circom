pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/bitify.circom";
include "circomlib/comparators.circom";
include "circomlib/gates.circom";
include "circomlib/eddsaposeidon.circom";

/*
 * This circuit enables a user to prove wallet ownership through ZKP authentication 
 * without exposing their private key, using a key share instead.
 *
 * Security features:
 * 1. Username-salt binding to prevent credential mixing attacks
 * 2. Proper rate-limiting enforcement through time-based verification
 * 3. Complete challenge-response mechanism with in-circuit verification
 * 4. Device binding for multi-factor authentication
 * 5. Uses 64-bit timestamps with reasonableness checks
 * 6. Constrained input ranges with explicit bit-length checks
 * 7. Timestamp bound verification to prevent future timestamp attacks
 */

template WalletAuthCircuit() {
    // Private inputs
    signal input keyShare;       // User's key share instead of full private key (secret)
    signal input userSalt;       // User-specific salt (secret)
    signal input deviceId;       // ID of the device being used (secret)
    
    // Public inputs (visible to verifier)
    signal input username;                 // Username/identifier (public)
    signal input usernameHash;             // Hash of registered username (public)
    signal input publicIdentityCommitment; // Registered identity commitment
    signal input registeredSaltCommitment; // Salt commitment for this username
    signal input deviceCommitment;         // Registered device commitment
    signal input lastAuthTimestamp;        // Last successful auth timestamp
    signal input currentTimestamp;         // Current server timestamp (public)
    signal input maxTimestamp;             // Maximum reasonable timestamp
    signal input challengeValue;           // Server-provided challenge
    signal input expectedChallengeResponse; // Expected response to challenge
    signal input securityThreshold;        // Time threshold for rate limiting (public)
    signal input minSecurityThreshold;     // Minimum allowed threshold to prevent rate limit bypass
    
    // Outputs
    signal output isAuthenticated;   // Boolean: 1 if authenticated, 0 if not
    
    // Step 1: Verify the username matches the registered hash
    component usernameHasher = Poseidon(1);
    usernameHasher.inputs[0] <== username;
    
    signal usernameMatches;
    usernameMatches <== IsEqual()([usernameHasher.out, usernameHash]);
    
    // Ensure username validation is enforced
    usernameMatches === 1;
    
    // Step 2: Verify the salt is correct for this username
    component saltVerifier = Poseidon(2);
    saltVerifier.inputs[0] <== username;
    saltVerifier.inputs[1] <== userSalt;
    
    signal saltIsCorrect;
    saltIsCorrect <== IsEqual()([saltVerifier.out, registeredSaltCommitment]);

    saltIsCorrect === 1;
    
    // Step 3: Create the identity commitment from key share and salt
    component idCommitment = Poseidon(2);
    idCommitment.inputs[0] <== keyShare;
    idCommitment.inputs[1] <== userSalt;
    
    // Verify the identity commitment matches the registered one
    signal identityMatches;
    identityMatches <== IsEqual()([idCommitment.out, publicIdentityCommitment]);

    identityMatches === 1;
    
    // Step 4: Generate and verify device-specific commitment
    component deviceHasher = Poseidon(2);
    deviceHasher.inputs[0] <== idCommitment.out;
    deviceHasher.inputs[1] <== deviceId;
    
    signal deviceAuthorized;
    deviceAuthorized <== IsEqual()([deviceHasher.out, deviceCommitment]);

    deviceAuthorized === 1;
    
    // Step 5: Validate timestamp ranges and formats (64-bit)
    component currTimestampBits = Num2Bits(64);
    currTimestampBits.in <== currentTimestamp;
    
    component lastTimestampBits = Num2Bits(64);
    lastTimestampBits.in <== lastAuthTimestamp;
    
    // Check timestamps are reasonable (not too far in the future)
    component currTimestampReasonable = LessThan(64);
    currTimestampReasonable.in[0] <== currentTimestamp;
    currTimestampReasonable.in[1] <== maxTimestamp;
    
    component lastTimestampReasonable = LessThan(64);
    lastTimestampReasonable.in[0] <== lastAuthTimestamp;
    lastTimestampReasonable.in[1] <== maxTimestamp;
    
    // Step 6: Time-based verification - ensure current time is newer than last auth
    component timeVerifier = GreaterThan(64);
    timeVerifier.in[0] <== currentTimestamp;
    timeVerifier.in[1] <== lastAuthTimestamp;
    
    // Step 7: Rate limit enforcement - verify time difference is within threshold
    signal timeDiff <== currentTimestamp - lastAuthTimestamp;
    
    // Ensure the security threshold is positive and reasonable
    component thresholdPositive = GreaterThan(32);
    thresholdPositive.in[0] <== securityThreshold;
    thresholdPositive.in[1] <== 0;
    
    // Ensure the security threshold meets minimum requirements
    component thresholdMinValid = GreaterThan(32);
    thresholdMinValid.in[0] <== securityThreshold;
    thresholdMinValid.in[1] <== minSecurityThreshold - 1; // Allow the minimum
    
    component withinRateLimit = LessThan(64);
    withinRateLimit.in[0] <== timeDiff;
    withinRateLimit.in[1] <== securityThreshold;
    
    signal rateCheckPassed;
    rateCheckPassed <== withinRateLimit.out;
    
    // Step 8: Complete challenge-response verification
    // Compute the challenge response within the circuit
    component challengeResponseComputer = Poseidon(3);
    challengeResponseComputer.inputs[0] <== idCommitment.out;
    challengeResponseComputer.inputs[1] <== currentTimestamp;
    challengeResponseComputer.inputs[2] <== challengeValue;
    
    // Verify the computed response matches the expected response
    signal responseMatches;
    responseMatches <== IsEqual()([challengeResponseComputer.out, expectedChallengeResponse]);
    
    // This constraint is critical for security
    responseMatches === 1;
    
    // Final authentication decision combines all checks
    // We need to break down the multiplication into steps to avoid non-quadratic constraints
    signal check1; // Combine first 2 checks
    check1 <== saltIsCorrect * identityMatches;
    
    signal check2; // Combine with next 2 checks
    check2 <== check1 * deviceAuthorized;
    
    signal check3; // Continue combining
    check3 <== check2 * timeVerifier.out;
    
    signal check4;
    check4 <== check3 * currTimestampReasonable.out;
    
    signal check5;
    check5 <== check4 * lastTimestampReasonable.out;
    
    signal check6;
    check6 <== check5 * thresholdPositive.out;
    
    signal check7;
    check7 <== check6 * thresholdMinValid.out;
    
    signal check8;
    check8 <== check7 * rateCheckPassed;
    
    signal check9;
    check9 <== check8 * responseMatches;
    
    // Final result
    isAuthenticated <== check9;
}

component main {public [
    username,
    usernameHash,
    publicIdentityCommitment, 
    registeredSaltCommitment,
    deviceCommitment,
    lastAuthTimestamp,
    currentTimestamp,
    maxTimestamp,
    challengeValue,
    expectedChallengeResponse,
    securityThreshold,
    minSecurityThreshold
]} = WalletAuthCircuit();