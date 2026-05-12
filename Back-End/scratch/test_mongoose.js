import mongoose from 'mongoose';
try {
  mongoose.connect(undefined);
  console.log('Success with undefined');
} catch (e) {
  console.log('Failed with undefined:', e.message);
}
