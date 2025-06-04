import { initializeApp } from './app';

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    const app = await initializeApp();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
      console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer().catch(error => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});