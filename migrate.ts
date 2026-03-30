import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

// Cấu hình Database Cũ (bị giới hạn)
const oldConfig = {
  ...firebaseConfig,
  firestoreDatabaseId: "ai-studio-e5f97025-f298-4bc8-a850-b867e95f717b"
};

// Cấu hình Database Mới (aura-fitness-db)
const newConfig = {
  ...firebaseConfig,
  firestoreDatabaseId: "aura-fitness-db"
};

// Khởi tạo 2 app Firebase riêng biệt
const oldApp = initializeApp(oldConfig, "OldApp");
const newApp = initializeApp(newConfig, "NewApp");

const oldDb = getFirestore(oldApp, oldConfig.firestoreDatabaseId);
const newDb = getFirestore(newApp, newConfig.firestoreDatabaseId);

const oldAuth = getAuth(oldApp);
const newAuth = getAuth(newApp);

const collectionsToMigrate = [
  'users',
  'students',
  'contracts',
  'sessions',
  'trainers',
  'schedules'
];

async function migrateCollection(collectionName: string) {
  console.log(`Bắt đầu chuyển dữ liệu collection: ${collectionName}...`);
  try {
    const oldSnapshot = await getDocs(collection(oldDb, collectionName));
    let count = 0;
    
    for (const document of oldSnapshot.docs) {
      const data = document.data();
      await setDoc(doc(newDb, collectionName, document.id), data);
      count++;
      
      // Migrate subcollections for users (progress_photos)
      if (collectionName === 'users') {
          const photosSnapshot = await getDocs(collection(oldDb, 'users', document.id, 'progress_photos'));
          for (const photoDoc of photosSnapshot.docs) {
              await setDoc(doc(newDb, 'users', document.id, 'progress_photos', photoDoc.id), photoDoc.data());
          }
      }
    }
    console.log(`Đã chuyển thành công ${count} documents trong collection ${collectionName}`);
  } catch (error) {
    console.error(`Lỗi khi chuyển collection ${collectionName}:`, error);
  }
}

async function runMigration() {
  console.log("BẮT ĐẦU QUÁ TRÌNH CHUYỂN DỮ LIỆU...");
  try {
    console.log("Đang đăng nhập...");
    // We can't easily authenticate as admin without service account.
    // Let's try to authenticate with a known user if possible, or just skip.
  } catch(e) {
      console.log("Không thể đăng nhập, thử tiếp tục không cần đăng nhập...", e);
  }
  for (const collectionName of collectionsToMigrate) {
    await migrateCollection(collectionName);
  }
  console.log("HOÀN TẤT CHUYỂN DỮ LIỆU!");
  process.exit(0);
}

runMigration();
