'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Library } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarBody,
  SidebarContent,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/library',
      label: 'My Library',
      icon: Library,
    },
  ];

  return (
    <>
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarBody>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="justify-start"
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarRail />
      </SidebarBody>
    </>
  );
};

export default AppSidebar;
