// frontend/src/app/test/page.tsx
'use client';
import IntegrationTest from '@/components/IntegrationTest';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <IntegrationTest />
      </div>
    </div>
  );
}