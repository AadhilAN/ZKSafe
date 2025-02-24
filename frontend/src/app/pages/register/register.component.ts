import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = { 
    name: '', 
    email: '', 
    password: '', 
    password2: '' 
  };
  loading = false;

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  async register() {
    if (!this.user.name || !this.user.email || !this.user.password || !this.user.password2) {
      alert('All fields are required.');
      return;
    }

    // Corrected password matching validation
    if (this.user.password == this.user.password2) {
      alert('Passwords should not match.');
      return;
    }
    
    this.loading = true;
    
    try {
      // 1. Generate Ethereum Wallet (now includes publicKey)
      const wallet = await this.generateWallet();

      // 2. Send registration data to server
      const registrationData = {
        name: this.user.name,
        email: this.user.email,
        password: this.user.password,
        password2: this.user.password2,
        walletAddress: wallet.address
      };

      await this.http.post('http://localhost:5010/api/auth/register', registrationData)
        .subscribe({
          next: async (response) => {
            // 3. Create and download JSON file
            const jsonContent = JSON.stringify({
              privateKey: wallet.privateKey,
              walletAddress: wallet.address
            }, null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            
            // Create download link and trigger click
            const a = document.createElement('a');
            a.href = url;
            a.download = 'input.json';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 0);

            // 4. Show success message
            alert('Registration successful! Your keys have been downloaded as input.json. Please save it securely.');

            // 5. Redirect to login
            this.router.navigate(['/login']);
          },
          error: (err) => {
            alert('Error: ' + err.error.message);
          }
        });

    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      this.loading = false;
    }
  }

  private async generateWallet() {
    const ethers = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
  }
}