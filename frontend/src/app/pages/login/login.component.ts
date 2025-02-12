import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user = { email: '', password: '', password2: '', proof: {}, publicSignals: [] };

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http.post('http://localhost:5010/api/auth/login', this.user).subscribe({
      next: (response: any) => {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Login failed: ' + err.error.message);
      }
    });
  }
}
