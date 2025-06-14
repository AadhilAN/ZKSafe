import { HttpClient } from '@angular/common/http';

export class IPFSUtils {
  static async getSharesFromIPFS(http: HttpClient, password: string): Promise<string[]> {
    try {
      const response: any = await http.post('http://localhost:5010/api/ipfs/get-user-shares', {
        password: password
      }).toPromise();

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