import { Moon, Sun } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import useColorMode from '../hooks/useColorMode';

const DarkModeSwitcher = () => {
  const [colorMode, setColorMode] = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <div className='flex items-center gap-2'>
      <Sun className='size-4 text-muted-foreground' />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => {
          if (typeof setColorMode === 'function') {
            setColorMode(checked ? 'dark' : 'light');
          }
        }}
        aria-label='Toggle dark mode'
      />
      <Moon className='size-4 text-muted-foreground' />
    </div>
  );
};

export default DarkModeSwitcher;
