import path from 'path';
import fs from 'fs';
import { backupDatabase, listBackups } from '../server/db.ts';

async function main() {
  console.log('🔄 جاري إنشاء نسخة احتياطية من قاعدة البيانات...');
  const res = backupDatabase();
  if (res.success) {
    console.log(`✅ تم إنشاء النسخة الاحتياطية بنجاح!`);
    console.log(`📁 الملف: ${res.filename}`);
    console.log(`📍 المسار: ${res.path}`);
  } else {
    console.error(`❌ فشل إنشاء النسخة الاحتياطية: ${res.error}`);
    process.exit(1);
  }

  console.log('\n📋 النسخ الاحتياطية المتوفرة:');
  const backups = listBackups();
  if (backups.length === 0) {
    console.log('لا توجد نسخ احتياطية سابقة.');
  } else {
    backups.forEach((b, idx) => {
      const sizeKb = (b.size / 1024).toFixed(1);
      console.log(` ${idx + 1}. ${b.filename} (${sizeKb} KB) - ${b.date}`);
    });
  }
}

main().catch(err => {
  console.error('Error during backup:', err);
  process.exit(1);
});
