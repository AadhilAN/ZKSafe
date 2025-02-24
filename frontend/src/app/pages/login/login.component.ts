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
    password2: '',
    proof: { 
      pi_a: [] as string[], 
      pi_b: [] as string[][], 
      pi_c: [] as string[] 
    }, 
    publicSignals: '' 
  };
  
  // keyData: { privateKey: string, publicKey: string } | null = null;
  circuitInput: any = null;
  uploadedFileName = '';
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  async login() {
    // Validate passwords match
    // if (this.user.password == this.user.password2) {
    //   alert('Passwords do not match');
    //   return;
    // }

    // Validate key file uploaded
    if (!this.circuitInput) {
      alert('Please upload a valid key file');
      return;
    }

    this.loading = true;
    
    try {
      // Load circuit files
      const [wasm, zkey] = await Promise.all([
        fetch('assets/wallet_ownership.wasm').then(r => r.arrayBuffer()).then(b => new Uint8Array(b)),
        fetch('assets/circuit_0000.zkey').then(r => r.arrayBuffer()).then(b => new Uint8Array(b))
      ]);

      // Generate proof using uploaded private key
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        this.circuitInput,
        wasm,
        zkey
      );

      // Format proof for API
      this.user.proof = {
        pi_a: proof.pi_a,
        pi_b: proof.pi_b.map(arr => [arr[0], arr[1]]),
        pi_c: proof.pi_c
      };
      this.user.publicSignals = JSON.stringify(publicSignals);

      // Send login request with all data
      const response: any = await this.http.post(
        'http://localhost:5010/api/auth/login', 
        {
          email: this.user.email,
          password: this.user.password,
          password2: this.user.password2,
          proof: this.user.proof,
          publicSignals: this.user.publicSignals,
          publicKey: this.circuitInput.publicKey
        }
      ).toPromise();

      localStorage.setItem('token', response.token);
      localStorage.setItem('email', response.email);
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.error?.message || 
                          error.message || 
                          'Authentication failed';
      alert(errorMessage);
    } finally {
      this.loading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.privateKey || !data.walletAddress) {
          throw new Error('Invalid key file format');
        }
        this.circuitInput = data;
        this.uploadedFileName = file.name;
      } catch (e) {
        alert('Invalid JSON file format');
        this.circuitInput = null;
        this.uploadedFileName = '';
      }
    };
    reader.readAsText(file);
  }

  // private async hashPassword(password: string): Promise<string> {
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(password);
  //   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  //   return Array.from(new Uint8Array(hashBuffer))
  //     .map(b => b.toString(16).padStart(2, '0'))
  //     .join('');
  // }
}