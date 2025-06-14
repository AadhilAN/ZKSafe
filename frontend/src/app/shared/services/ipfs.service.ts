import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IPFSService {
  constructor(private http: HttpClient) {}

  async getSharesFromIPFS(password: string): Promise<string[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.post('http://localhost:5010/api/ipfs/get-shards', {
          password: password
        })
      );

      if (!response.success || !response.shares) {
        throw new Error('Failed to fetch shares from IPFS');
      }

      return response.shares.map((share: any) => share.base64Share);
    } catch (error) {
      console.error('Error fetching shares from IPFS:', error);
      throw error;
    }
  }
}