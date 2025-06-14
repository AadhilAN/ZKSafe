import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import { JsonRpcProvider, Wallet } from 'ethers';
import { reconstructAndDecryptPrivateKey } from 'src/app/shared/utils/crypto-utils';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  walletAddress: string = '';
  balance: number = 0;
  recipientAddress: string = '';
  amount: number = 0;
  privateKey: string = '';
  loading = false;
  loadingMessage = 'Processing...';
  
  constructor(private http: HttpClient) {}
  
  async ngOnInit() {
    this.loadingMessage = 'Loading wallet...';
    this.loading = true;
    await this.recoverPrivateKey();
    this.getWalletDetails();
  }

  async recoverPrivateKey() {
    try {
      const encryptedUserShard = localStorage.getItem('userShard');
      const otherSharesJSON = sessionStorage.getItem('tempShares');
      const password = sessionStorage.getItem('password');
  
      if (!encryptedUserShard || !otherSharesJSON || !password) {
        throw new Error('Missing shards or password from storage.');
      }
  
      const otherSharesBase64: string[] = JSON.parse(otherSharesJSON);
  
      this.privateKey = await reconstructAndDecryptPrivateKey(
        encryptedUserShard,
        otherSharesBase64,
        password
      );
  
      console.log('Private key successfully reconstructed');
    } catch (err) {
      console.error('Failed to recover private key:', err);
      this.privateKey = localStorage.getItem('privateKey') as string;
    }
  }
  
  getWalletDetails() {
    const token = localStorage.getItem('token');
    console.log(token);
    this.http.get<any>('http://localhost:5010/api/wallet/details', {
      headers: { Authorization: `${token}` }
    }).subscribe({
      next: (data) => {
        this.walletAddress = data.walletAddress;
        this.getBalance();
      },
      error: (err) => {
        console.error('Error fetching wallet details:', err);
        this.loading = false;
      }
    });
  }
  
  getBalance() {
    const token = localStorage.getItem('token');
    this.loadingMessage = 'Fetching balance...';
    this.loading = true;
    this.http.get<any>(`http://localhost:5010/api/wallet/balance`, {
      headers: { Authorization: `${token}` }
    })
      .subscribe({
        next: (response) => {
          this.balance = response.balance;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching balance:', err);
          this.loading = false;
        }
      });
  }
  
  async transferEther() {
    if (!this.privateKey || !this.recipientAddress || this.amount <= 0) {
      alert("Please enter a valid recipient address and amount.");
      return;
    }
    
    this.loading = true;
    try {
      this.loadingMessage = 'Sending transaction...';
      const provider = new JsonRpcProvider('https://sepolia.infura.io/v3/151e8b37d18b4b8ebbadc74f189ddf2e');
      const wallet = new Wallet(this.privateKey, provider);
      const amountInWei = ethers.parseEther(this.amount.toString());
      
      const tx = await wallet.sendTransaction({
        to: this.recipientAddress,
        value: amountInWei
      });
      
      console.log('Transaction sent:', tx.hash);
      alert(`Transaction submitted! Hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      alert("Transfer successful!");
      
      this.getBalance();
    } catch (err: any) {
      console.error('Error sending transaction:', err);
      alert("Transfer failed: " + (err.message || err));
    } finally {
      this.loading = false;
    }
  }
}