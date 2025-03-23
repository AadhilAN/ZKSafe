import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as snarkjs from 'snarkjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user = { 
    email: '',
    password: '',
    password2: ''
  };
  
  circuitInput: any = null;
  uploadedFileName = '';
  loading = false;
  loadingMessage = 'Processing...';

  constructor(private http: HttpClient, private router: Router) {}

  async login() {
    if (!this.user.email || !this.user.password || !this.user.password2) {
      alert('Please fill in all required fields');
      return;
    }

    if (!this.circuitInput) {
      alert('Please upload your key file');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Verifying credentials...';
    
    try {
      // Phase 1: Send credentials to get challenge
      const initiateResponse: any = await this.http.post(
        'http://localhost:5010/api/auth/initiate-login', 
        {
          email: this.user.email,
          password: this.user.password,
          password2: this.user.password2
        }
      ).toPromise();
      
      console.log("Received challenge:", initiateResponse);
      
      // Phase 2: Generate proof using challenge
      this.loadingMessage = 'Generating zero-knowledge proof...';
      
      // Prepare circuit inputs with the challenge data
      const circuitInputs = {
        // Private inputs from key file
        keyShare: this.circuitInput.keyShare || this.circuitInput.shares?.[0] || "",
        userSalt: this.circuitInput.userSalt || "",
        deviceId: this.circuitInput.deviceId || "",
        
        // Public inputs from challenge
        username: initiateResponse.username,
        usernameHash: initiateResponse.usernameHash,
        publicIdentityCommitment: initiateResponse.publicIdentityCommitment,
        registeredSaltCommitment: initiateResponse.registeredSaltCommitment,
        deviceCommitment: initiateResponse.deviceCommitment,
        lastAuthTimestamp: initiateResponse.lastAuthTimestamp,
        currentTimestamp: initiateResponse.currentTimestamp,
        maxTimestamp: initiateResponse.maxTimestamp,
        challengeValue: initiateResponse.challengeValue,
        securityThreshold: initiateResponse.securityThreshold,
        minSecurityThreshold: initiateResponse.minSecurityThreshold
      };

      console.log("Circuit inputs:", circuitInputs);
      
      // Load circuit files
      const [wasm, zkey] = await Promise.all([
        fetch('assets/wallet_auth_circuit.wasm').then(r => r.arrayBuffer()),
        fetch('assets/wallet_auth_circuit.zkey').then(r => r.arrayBuffer())
      ]);
      
      // Generate proof
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        new Uint8Array(wasm),
        new Uint8Array(zkey)
      );
      
      console.log("Proof generated:", proof);
      console.log("Public signals:", publicSignals);
      
      // Phase 3: Send proof to complete login
      this.loadingMessage = 'Verifying proof...';
      
      const completeResponse: any = await this.http.post(
        'http://localhost:5010/api/auth/complete-login', 
        {
          email: this.user.email,
          proof: {
            pi_a: proof.pi_a,
            pi_b: proof.pi_b,
            pi_c: proof.pi_c
          },
          publicSignals: publicSignals
        }
      ).toPromise();
      
      console.log("Login completed:", completeResponse);
      
      // Store authentication data
      localStorage.setItem('token', completeResponse.token);
      localStorage.setItem('email', completeResponse.email);
      
      // Navigate to dashboard
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
        
        // Validate key file contents
        if (!data.shares && !data.keyShare) {
          throw new Error('Invalid key file: missing key share data');
        }
        
        if (!data.userSalt) {
          throw new Error('Invalid key file: missing user salt');
        }
        
        if (!data.deviceId) {
          throw new Error('Invalid key file: missing device ID');
        }
        
        this.circuitInput = data;
        this.uploadedFileName = file.name;
        console.log('Key file loaded:', this.circuitInput);
        
      } catch (e) {
        console.error('File parsing error:', e);
        alert('Invalid key file format: ' + (e as Error).message);
        this.circuitInput = null;
        this.uploadedFileName = '';
      }
    };
    reader.readAsText(file);
  }
}