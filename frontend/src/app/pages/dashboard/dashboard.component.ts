import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getWalletDetails();
  }

  // Fetch user wallet details (walletAddress)
  getWalletDetails() {
    const token = localStorage.getItem('token');
    this.http.get<any>('http://localhost:5010/api/wallet/details', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.walletAddress = data.walletAddress;
        this.getBalance();
      },
      error: (err) => {
        console.error('Error fetching wallet details:', err);
      }
    });
  }

  // Fetch wallet balance
  getBalance() {
    this.http.get<any>(`http://localhost:5010/api/wallet/balance?address=${this.walletAddress}`)
      .subscribe({
        next: (response) => {
          this.balance = response.balance;
        },
        error: (err) => {
          console.error('Error fetching balance:', err);
        }
      });
  }

  // Transfer Ether function
  transferEther() {
    if (!this.recipientAddress || this.amount <= 0) {
      alert("Please enter a valid recipient address and amount.");
      return;
    }

    const token = localStorage.getItem('token');
    this.http.post('http://localhost:5010/api/wallet/transfer', {
      recipient: this.recipientAddress,
      amount: this.amount
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        alert("Transfer successful!");
        this.getBalance(); // Refresh balance after transfer
      },
      error: (err) => {
        alert("Transfer failed: " + err.error.message);
      }
    });
  }
}
