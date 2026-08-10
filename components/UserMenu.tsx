'use client';

import { useState, useRef, useEffect } from 'react';

interface UserMenuProps {
  user: { email: string; avatar?: string };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signout';
    document.body.appendChild(form);
    form.submit();
  };

  const initial = user.email.charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className="user-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </div>
        <span className="user-email">{user.email}</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <button className="user-menu-item danger" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
