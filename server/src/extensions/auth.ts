import { Extension } from '@hocuspocus/server';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const auth: Extension = {
  async onAuthenticate({ token, documentName }) {
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);

      // You can add additional checks here, like verifying
      // if the user has access to this specific document

      return decoded;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Invalid token');
    }
  },
};
