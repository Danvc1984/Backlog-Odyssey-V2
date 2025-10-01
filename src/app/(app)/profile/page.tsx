'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-primary mb-6">My Profile</h2>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under construction. Please check back later for profile settings.</p>
        </CardContent>
      </Card>
    </div>
  );
}
