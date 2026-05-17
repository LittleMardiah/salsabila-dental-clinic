'use client';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { useEffect, useState } from 'react';

const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default as any),
  { ssr: false, loading: () => <div className="p-8 text-center">Loading Swagger UI...</div> }
) as any; 

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => setSpec(data));
  }, []);

  if (!spec) return <div className="p-8 text-center">Loading documentation...</div>;

  return (
    <div className="container mx-auto p-4">
      <SwaggerUI spec={spec} />
    </div>
  );
}