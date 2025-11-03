import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenChat = () => {
    navigate('/civic-guide');
  };

  return (
    <>
      <Button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-strong z-50 bg-gradient-hero hover:scale-110 transition-transform"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    </>
  );
}
