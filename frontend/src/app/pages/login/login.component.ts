import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as snarkjs from 'snarkjs';
import { stringToFieldElement, hashValue, convertInputToField } from '../../shared/utils/crypto-utils';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  user = { 
    email: '',
    password: '',
    password2: ''
  };
  
  circuitInput: any = null;
  uploadedFileName = '';
  loading = false;
  loadingMessage = 'Processing...';
  showFileUpload = false;
  verificationMethod: string = 'off-chain';
  
  private apiUrl = 'http://localhost:5010/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.checkLocalStorage();
  }

  checkLocalStorage() {
    const userShard = localStorage.getItem('userShard');
    const userSalt = localStorage.getItem('userSalt');
    const deviceId = localStorage.getItem('deviceId');

    this.showFileUpload = !userShard || !userSalt || !deviceId;
    
    if (this.showFileUpload) {
      setTimeout(() => {
        alert('Key file data is missing. Please upload your key file to continue.');
      }, 500);
    }
  }

  async login() {
    if (!this.user.email || !this.user.password || !this.user.password2) {
      alert('Please fill in all required fields');
      return;
    }

    this.loading = true;
    
    try {
      this.loadingMessage = 'Verifying credentials...';
      
      const challengeResponse: any = await this.http.post(
        `${this.apiUrl}/initiate-login`, 
        {
          email: this.user.email,
          password: this.user.password,
          password2: this.user.password2
        }
      ).toPromise();
      
        let keyShareBase64;
        let userSaltValue;
        let deviceIdValue;
        const crypto = await import('crypto-js');
        
        // Decrypt the user shard using password
        const encryptedShard = localStorage.getItem('userShard');
        if (encryptedShard) {
          try {
            keyShareBase64 = crypto.AES.decrypt(encryptedShard, this.user.password).toString(crypto.enc.Utf8);
          } catch (e) {
            console.error("Error decrypting user shard:", e);
            alert("Wrong password. Cannot decrypt key share.");
            this.loading = false;
            return;
          }
        } else {
          keyShareBase64 = null;
        }
        
        userSaltValue = localStorage.getItem('userSalt');
        deviceIdValue = localStorage.getItem('deviceId');

      if (!keyShareBase64 || !userSaltValue || !deviceIdValue) {
        alert('Missing required authentication data');
        this.loading = false;
        return;
      }

      // Convert Base64 key share to BigInt
      console.log("Key share base64:", keyShareBase64);
      
      // Convert userSalt and deviceId to BigInt safely
      let userSaltBigInt;
      let deviceIdBigInt;
      try {
        // Handle userSalt - if it starts with '0x', it's a hex string
        if (typeof userSaltValue === 'string' && userSaltValue.startsWith('0x')) {
          userSaltBigInt = BigInt(userSaltValue);
        } else {
          // Try to convert from base64 if needed
          try {
            const userSaltBuffer = Buffer.from(userSaltValue, 'base64');
            const userSaltHex = userSaltBuffer.toString('hex');
            userSaltBigInt = BigInt('0x' + userSaltHex);
          } catch (e) {
            // If conversion fails, try direct
            userSaltBigInt = BigInt(userSaltValue);
          }
        }
        
        // Handle deviceId similarly
        if (typeof deviceIdValue === 'string' && deviceIdValue.startsWith('0x')) {
          deviceIdBigInt = BigInt(deviceIdValue);
        } else {
          try {
            const deviceIdBuffer = Buffer.from(deviceIdValue, 'base64');
            const deviceIdHex = deviceIdBuffer.toString('hex');
            deviceIdBigInt = BigInt('0x' + deviceIdHex);
          } catch (e) {
            deviceIdBigInt = BigInt(deviceIdValue);
          }
        }
      } catch (err) {
        console.error("Error converting userSalt or deviceId to BigInt:", err);
        alert("Invalid userSalt or deviceId format. Please upload your key file again.");
        this.loading = false;
        return;
      }
      
      console.log('Username hash from server:', challengeResponse.usernameHash);
      
      // Get a field element representation of the username using standardized function
      const usernameFieldElement = stringToFieldElement(challengeResponse.username);
      const keyShare = await convertInputToField(keyShareBase64.toString());
      console.log("Username field element Login:", usernameFieldElement.toString());
      console.log("Username:", challengeResponse.username);
      console.log("Username hash:", challengeResponse.usernameHash);
      console.log("Salt commitment:", challengeResponse.registeredSaltCommitment);
      console.log("Identity commitment:", challengeResponse.publicIdentityCommitment);
      console.log("Device commitment:", challengeResponse.deviceCommitment);
      
      // Important: Use the usernameFieldElement we calculated with the standardized function
      const circuitInputs = {
        keyShare: keyShare,
        userSalt: userSaltBigInt,
        deviceId: deviceIdBigInt,
        username: usernameFieldElement.toString(), // Use our calculated field element
        usernameHash: BigInt(challengeResponse.usernameHash),
        publicIdentityCommitment: BigInt(challengeResponse.publicIdentityCommitment),
        registeredSaltCommitment: challengeResponse.registeredSaltCommitment, 
        deviceCommitment: challengeResponse.deviceCommitment,
        lastAuthTimestamp: BigInt(challengeResponse.lastAuthTimestamp),
        currentTimestamp: BigInt(challengeResponse.currentTimestamp),
        maxTimestamp: BigInt(challengeResponse.maxTimestamp),
        challengeValue: challengeResponse.challengeValue,
        expectedChallengeResponse: challengeResponse.expectedChallengeResponse,
        securityThreshold: challengeResponse.securityThreshold,
        minSecurityThreshold: challengeResponse.minSecurityThreshold
      };
      
      console.log('Circuit inputs:', {
        keyShare: keyShare.toString(),
        userSalt: userSaltBigInt.toString(),
        deviceId: deviceIdBigInt.toString(),
        username: circuitInputs.username.toString(),
        usernameHash: circuitInputs.usernameHash.toString(),
        publicIdentityCommitment: circuitInputs.publicIdentityCommitment.toString(),
        registeredSaltCommitment: circuitInputs.registeredSaltCommitment.toString(),
        deviceCommitment: circuitInputs.deviceCommitment.toString(),
        lastAuthTimestamp: circuitInputs.lastAuthTimestamp.toString(),
        currentTimestamp: circuitInputs.currentTimestamp.toString(),
        maxTimestamp: circuitInputs.maxTimestamp.toString(),
        challengeValue: circuitInputs.challengeValue.toString(),
        expectedChallengeResponse: circuitInputs.expectedChallengeResponse.toString(),
        securityThreshold: circuitInputs.securityThreshold.toString(),
        minSecurityThreshold: circuitInputs.minSecurityThreshold.toString()
      });
      
      // Load circuit artifacts
      const [wasm, zkey] = await Promise.all([
        fetch('assets/circuit/wallet_auth_circuit.wasm').then(r => r.arrayBuffer()),
        fetch('assets/circuit/wallet_auth_circuit_0000.zkey').then(r => r.arrayBuffer())
      ]);
      
      // Generate ZK proof
      this.loadingMessage = 'Generating zero-knowledge proof...';
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        new Uint8Array(wasm),
        new Uint8Array(zkey)
      );
      console.log("Proof:", proof);
      console.log("Public signals:", publicSignals);
      
      // Verify proof with server
      this.loadingMessage = 'Verifying proof...';
      console.log("verficationMethod:", this.verificationMethod);
      const endpoint = this.verificationMethod === 'on-chain' 
        ? `${this.apiUrl}/complete-login-onchain` 
        : `${this.apiUrl}/complete-login`;
      const loginResponse: any = await this.http.post(
        endpoint,
        {
          email: this.user.email,
          proof: {
            pi_a: proof.pi_a,
            pi_b: proof.pi_b,
            pi_c: proof.pi_c
          },
          publicSignals: publicSignals,
          challengeData: challengeResponse.challengeValue,
        }
      ).toPromise();
      
      // Save new key file data if uploaded
      if (this.circuitInput) {
        // Encrypt the shard before saving if we have a new one
        const crypto = await import('crypto-js');
        const encryptedShard = crypto.AES.encrypt(keyShareBase64, this.user.password);
        localStorage.setItem('userShard', encryptedShard.toString());
        localStorage.setItem('userSalt', userSaltValue);
        localStorage.setItem('deviceId', deviceIdValue);
      }
      
      // Store auth token
      localStorage.setItem('token', loginResponse.token);
      localStorage.setItem('email', loginResponse.email);
      sessionStorage.setItem('password', this.user.password);

      this.loadingMessage = 'Fetching shares from IPFS...';
    try {
      const sharesResponse: any = await this.http.post(
        'http://localhost:5010/api/ipfs/get-shards', 
        {
          password: this.user.password
        },
        {
          headers: { Authorization: `${loginResponse.token}` }
        }
      ).toPromise();
      
      if (sharesResponse.success && sharesResponse.shares) {
        const ipfsShares = sharesResponse.shares.map((share: any) => share.base64Share);
        // Store in session storage
        sessionStorage.setItem('tempShares', JSON.stringify(ipfsShares));
        console.log('Successfully retrieved shares from IPFS');
      } else {
        throw new Error('Failed to fetch shares from IPFS');
      }
    } catch (ipfsError) {
      console.error('Failed to fetch shares from IPFS:', ipfsError);
      alert('Warning: Failed to retrieve wallet shares from IPFS. You may need to upload your key file for full functionality.');
    }
      
      this.router.navigate(['/dashboard']);
      
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.error?.message || 
                          error.message || 
                          'Authentication failed';
      alert(errorMessage);
    } finally {
      this.loading = false;
      this.loadingMessage = 'Processing...';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
  
        // Validate key file
        if (!data.shares || !Array.isArray(data.shares)) {
          throw new Error('Missing or invalid shares');
        }
        if (!data.userSalt) throw new Error('Missing user salt');
        if (!data.deviceId) throw new Error('Missing device ID');
  
        // Ensure at least 4 shares exist to extract 2nd, 3rd, 4th
        if (data.shares.length < 4) {
          throw new Error('Insufficient shares found in key file');
        }
  
        // Store shares 2, 3, 4 in sessionStorage (can also use localStorage)
        const selectedShares = data.shares.slice(1, 4); // index 1 to 3
        sessionStorage.setItem('tempShares', JSON.stringify(selectedShares));
  
        this.circuitInput = data;
        this.uploadedFileName = file.name;
  
      } catch (e) {
        console.error('File error:', e);
        alert(`Invalid key file: ${(e as Error).message}`);
        this.circuitInput = null;
        this.uploadedFileName = '';
      }
    };
    reader.readAsText(file);
  }
}