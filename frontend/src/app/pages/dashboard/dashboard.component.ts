import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import { JsonRpcProvider, Wallet } from 'ethers';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  walletAddress: string = ''; // User's wallet address
  balance: number = 0; // Wallet balance
  recipientAddress: string = ''; // Address to send Ether
  amount: number = 0; // Amount of Ether to send
  privateKey: string = ''; // You'll need to securely get this (NOT from localStorage in production!)
  
  constructor(private http: HttpClient) {}
  
  ngOnInit() {
    this.getWalletDetails();
    
  }
  
  // Fetch user wallet details (walletAddress)
  getWalletDetails() {
    const token = localStorage.getItem('token');
    this.privateKey = localStorage.getItem('privateKey') || '';
    console.log(token);
    this.http.get<any>('http://localhost:5010/api/wallet/details', {
      headers: { Authorization: `${token}` }
    }).subscribe({
      next: (data) => {
        this.walletAddress = data.walletAddress;
        //this.privateKey = data.privateKey; // Assuming your API returns the private key (handle securely!)
        this.getBalance();
      },
      error: (err) => {
        console.error('Error fetching wallet details:', err);
      }
    });
  }
  
  // Fetch wallet balance
  getBalance() {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:5010/api/wallet/balance`, {
      headers: { Authorization: `${token}` }
    })
      .subscribe({
        next: (response) => {
          this.balance = response.balance;
        },
        error: (err) => {
          console.error('Error fetching balance:', err);
        }
      });
  }
  
  // Transfer Ether function - now signing and sending the transaction directly
  async transferEther() {
    if (!this.privateKey || !this.recipientAddress || this.amount <= 0) {
      alert("Please enter a valid recipient address and amount.");
      return;
    }
    
    try {
      // Create provider with your testnet URL
      const provider = new JsonRpcProvider('https://sepolia.infura.io/v3/151e8b37d18b4b8ebbadc74f189ddf2e');
      
      // Create a wallet instance with the private key and provider
      const wallet = new Wallet(this.privateKey, provider);
      
      // Convert the amount from ETH to Wei
      const amountInWei = ethers.parseEther(this.amount.toString());
      
      // Create and sign the transaction
      const tx = await wallet.sendTransaction({
        to: this.recipientAddress,
        value: amountInWei
      });
      
      console.log('Transaction sent:', tx.hash);
      alert(`Transaction submitted! Hash: ${tx.hash}`);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      alert("Transfer successful!");
      
      // Refresh balance after transfer
      this.getBalance();
    } catch (err: any) {
      console.error('Error sending transaction:', err);
      alert("Transfer failed: " + (err.message || err));
    }
  }
}