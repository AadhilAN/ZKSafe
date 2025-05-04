import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as sss from 'shamirs-secret-sharing';
import { Buffer } from 'buffer';
import { last } from 'rxjs';
import { getDeviceFingerprint, hashValue, poseidonHash, stringToFieldElement, calculateHash } from '../../shared/utils/crypto-utils';

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
  loadingMessage = 'Loading...';

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
    if (this.user.password === this.user.password2) {
      alert('Passwords should not match.');
      return;
    }
    
    this.loading = true;
    
    try {
      this.loadingMessage = 'Generating wallet...';
      //Generate Ethereum Wallet
      const wallet = await this.generateWallet();

      //Generate user-specific elements for ZKP
      const userSalt = await this.generateRandomFieldElement();
      const deviceId = await getDeviceFingerprint();

      //Encrypt the private key using the password
      const encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey, this.user.password);
      
      //Split the encrypted private key into 5 shares with threshold 4
      const shares = await this.splitSecret(encryptedPrivateKey, 5, 4);
      
      //Convert shares to Base64 strings for JSON storage
      const sharesBase64 = shares.map(share => Buffer.from(share).toString('base64'));

      const crypto = await import('crypto-js');
      // Encrypt the first share using AES with the user's password
      const userShard = crypto.AES.encrypt(sharesBase64[0], this.user.password);
      console.log("shareBase64: ", sharesBase64[0]);
      
      // Get a field element representation of the username - using standardized function
      const usernameFieldElement = stringToFieldElement(this.user.name);
      console.log("UserSalt: ", userSalt);
      console.log("Raw UsernameFieldElement: ", usernameFieldElement.toString());
      this.loadingMessage = 'Generating poseidon hash...';
      
      // 3. Generate ZKP identity commitments
      //const usernameHash = await poseidonHash([usernameFieldElement.toString()]);
      console.log("Hashing username field element...");
      const usernameHash2 = await calculateHash([usernameFieldElement.toString()]);
      //const saltCommitment = await poseidonHash([usernameFieldElement.toString(), userSalt]);
      console.log("Hashing salt commitment...");
      const saltCommitment2 = await calculateHash([usernameFieldElement.toString(), userSalt]);
      //const identityCommitment = await poseidonHash([sharesBase64[0], userSalt]);
      console.log("Hashing identity commitment...");
      const identityCommitment2 = await calculateHash([sharesBase64[0], userSalt]);
      //const deviceCommitment = await poseidonHash([identityCommitment, deviceId]);
      console.log("Hashing device commitment...");
      const deviceCommitment2 = await calculateHash([identityCommitment2, deviceId]);
      
      console.log("Username field element Register:", usernameFieldElement.toString());
      console.log("Username:" , this.user.name);
      console.log("Username hash:", usernameHash2);
      console.log("Salt commitment:", saltCommitment2);
      console.log("Identity commitment:", identityCommitment2);
      console.log("Device commitment:", deviceCommitment2);

      //Check if the poseidonHash match calculateHash
      // if (usernameHash !== usernameHash2) {
      //   console.error("Username hash mismatch!");
      // }
      // if (saltCommitment !== saltCommitment2) {
      //   console.error("Salt commitment mismatch!");
      // }
      // if (identityCommitment !== identityCommitment2) {
      //   console.error("Identity commitment mismatch!");
      // }
      // if (deviceCommitment !== deviceCommitment2) {
      //   console.error("Device commitment mismatch!");
      // }

      // 6. Send registration data to server
      const registrationData = {
        // User details
        name: this.user.name,
        email: this.user.email,
        password: this.user.password,
        password2: this.user.password2,
        // Wallet details
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        // ZKP-specific data
        usernameHash: usernameHash2,
        saltCommitment: saltCommitment2,
        identityCommitment: identityCommitment2,
        deviceCommitment: deviceCommitment2,
        shards: sharesBase64.slice(1),
        lastAuthTimestamp: new Date().toISOString().replace('Z', '+00:00')
        //maxAuthLevel: 10 // Default max auth level
      };

      console.log("Registration data:", registrationData);
      this.loadingMessage = 'Registering user...';

      this.http.post('http://localhost:5010/api/auth/register', registrationData)
        .subscribe({
          next: async (response: any) => {
            const userId = response.userId;
            // 7. Create and download JSON file with shares and ZKP inputs
            const jsonContent = JSON.stringify({
              //shares from index 1 to 4
              shares: sharesBase64.slice(1),
              walletAddress: wallet.address,
              threshold: 4,
              totalShares: 5,
              // ZKP input data for login
              privateKey: wallet.privateKey,
              userSalt: userSalt,
              deviceId: deviceId
            }, null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            
            // Create download link and trigger click
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wallet-zkp-shares.json';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 0);

            alert('Registration successful! Your wallet information has been split into 5 shares (threshold: 4) and downloaded as wallet-zkp-shares.json. Please store this file securely.');

            localStorage.setItem('userShard', userShard.toString());
            localStorage.setItem('userSalt', userSalt);
            localStorage.setItem('deviceId', deviceId);
            localStorage.setItem('privateKey', wallet.privateKey);

            //Upon user registration, send the shares from index 1 to 4 to the server
        const sharesToUpload = sharesBase64.slice(1);
        this.http.post('http://localhost:5010/api/ipfs/upload-shares', { 
          base64Shares: sharesToUpload,
          password: this.user.password,
          userId: userId
        })
          .subscribe({
            next: (response) => {
              console.log('Shares sent successfully:', response);
            },
            error: (error) => {
              console.error('Error sending shares:', error);
            }
          });

            // Redirect to login
            this.router.navigate(['/login']);
          },
          error: (err) => {
            alert('Error: ' + (err.error?.message || 'Registration failed'));
          }
        });
        

    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      this.loading = false;
    }
  }

  // Generate a random field element for ZKP using browser's crypto API
  private async generateRandomFieldElement(): Promise<string> {
    const array = new Uint8Array(31); // 31 bytes to ensure it's smaller than field size
    window.crypto.getRandomValues(array);
    return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  //Referenced https://docs.ethers.org/v4/api-wallet.html
  private async generateWallet() {
    const ethers = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
  }

  private async encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    const ethers = await import('ethers');
    const wallet = new ethers.Wallet(privateKey);
    
    // Encrypt the wallet using the password
    //Referenced https://ethereum.stackexchange.com/questions/150002/i-got-an-error-in-encrypting-the-private-key-using-ethers
    const encryptedWallet = await wallet.encrypt(password);
    
    return encryptedWallet;
  }

  private async splitSecret(secret: string, numShares: number, threshold: number): Promise<Uint8Array[]> {
    // Convert the string to Buffer
    const secretBuffer = Buffer.from(secret, 'utf8');
    
    // Generate the shares
    //Referenced https://www.npmjs.com/package/shamirs-secret-sharing-ts 
    const shares = sss.split(secretBuffer, { shares: numShares, threshold: threshold });
    
    return shares;
  }

  private async combineShares(shares: Uint8Array[]): Promise<string> {
    // Combine the shares to reconstruct the secret
    const recoveredBuffer = sss.combine(shares);
    
    // Convert Buffer back to string
    return recoveredBuffer.toString('utf8');
  }

  // Method to reconstruct and decrypt private key
  public async reconstructAndDecryptPrivateKey(sharesBase64: string[], password: string): Promise<string> {
    // Ensure we have at least 4 shares
    if (sharesBase64.length < 4) {
      throw new Error('At least 4 shares are required to reconstruct the private key');
    }
    try {
      // Convert base64 shares back to Uint8Array
      const shares = sharesBase64.map(share => Buffer.from(share, 'base64'));
      
      // Combine shares to get the encrypted wallet JSON
      const encryptedJson = await this.combineShares(shares);
      
      // Decrypt the wallet using the password
      const ethers = await import('ethers');
      const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
      
      return wallet.privateKey;
    } catch (error) {
      console.error('Error reconstructing or decrypting private key:', error);
      throw new Error('Failed to reconstruct or decrypt private key');
    }
  }
}