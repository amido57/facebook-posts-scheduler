const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { decrypt } = require('./encryption');

const prisma = new PrismaClient();

class PostQueue {
  constructor() {
    this.isProcessing = false;
    this.checkInterval = 60000; // Check every minute
  }

  start() {
    console.log('📮 Post Queue started');
    setInterval(() => this.processQueue(), this.checkInterval);
    this.processQueue(); // Run immediately on start
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const pendingPosts = await prisma.scheduledPost.findMany({
        where: {
          status: 'pending',
          scheduledTime: { lte: now }
        },
        include: {
          user: true,
          page: true
        }
      });

      for (const post of pendingPosts) {
        await this.publishPost(post);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async publishPost(post) {
    try {
      const accessToken = decrypt(post.page.accessToken);
      const pageId = post.page.pageId;

      let response;
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // Post with media
        response = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            url: post.mediaUrls[0],
            message: post.content,
            access_token: accessToken
          }
        );
      } else {
        // Text-only post
        response = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/feed`,
          {
            message: post.content,
            access_token: accessToken
          }
        );
      }

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          fbPostId: response.data.id
        }
      });

      console.log(`✅ Published post ${post.id} to page ${post.page.name}`);
    } catch (error) {
      console.error(`❌ Failed to publish post ${post.id}:`, error.message);
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'failed',
          error: error.message
        }
      });
    }
  }
}

module.exports = new PostQueue();
