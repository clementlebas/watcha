import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { logout } from 'wasp/client/auth';
import { Link as WaspRouterLink } from 'wasp/client/router';
import { type User as UserEntity } from 'wasp/entities';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { getDownloadFileSignedURL, useQuery } from 'wasp/client/operations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { userMenuItems } from './constants';

export function UserDropdown({ user }: { user: Partial<UserEntity> }) {
  const [open, setOpen] = useState(false);

  const isExternalUrl = user.avatarUrl?.startsWith('http') || user.avatarUrl?.startsWith('data:');
  const { data: signedUrl } = useQuery(getDownloadFileSignedURL, 
    { key: user.avatarUrl || '' }, 
    { enabled: !!user.avatarUrl && !isExternalUrl }
  );

  const displayUrl = isExternalUrl ? user.avatarUrl : signedUrl;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-2 duration-300 ease-in-out text-foreground hover:text-primary transition-colors focus:outline-none'>
          <Avatar className='size-8 border border-border shadow-sm'>
            <AvatarImage src={(displayUrl as string) || (user.picture ?? undefined)} className='object-cover' />
            <AvatarFallback className='bg-muted'>
              <UserIcon className='size-4 text-muted-foreground' />
            </AvatarFallback>
          </Avatar>
          <ChevronDown className='size-4 opacity-50' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-48 bg-background border border-border shadow-lg'>
        {userMenuItems.map((item) => {
          if (item.isAuthRequired && !user) return null;
          if (item.isAdminOnly && (!user || !user.isAdmin)) return null;

          return (
            <DropdownMenuItem key={item.name}>
              <WaspRouterLink
                to={item.to}
                onClick={() => {
                  setOpen(false);
                }}
                className='flex items-center gap-3 w-full'
              >
                <item.icon size='1.1rem' />
                {item.name}
              </WaspRouterLink>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem>
          <button type='button' onClick={() => logout()} className='flex items-center gap-3 w-full'>
            <LogOut size='1.1rem' />
            Log Out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
