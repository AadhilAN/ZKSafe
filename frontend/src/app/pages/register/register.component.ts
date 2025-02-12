import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = { name: '', email: '', password: '', password2: '' };

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    this.http.post('http://localhost:5010/api/auth/register', this.user).subscribe({
      next: (response) => {
        alert('Registration successful! You can now log in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        alert('Error: ' + err.error.message);
      }
    });
  }
}
