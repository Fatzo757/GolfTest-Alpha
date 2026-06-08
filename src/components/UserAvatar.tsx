import React from 'react';
import { 
  User, 
  Ghost, 
  Bot, 
  Swords, 
  Shield, 
  Flame, 
  Zap, 
  Target, 
  Star, 
  Crown,
  Heart,
  Skull,
  Anchor,
  Cloud,
  Moon,
  Sun,
  Eye,
  Smile,
  Gamepad2,
  Trophy,
  Coffee,
  Music,
  Camera,
  Feather,
  Umbrella,
  Rocket,
  Wand,
  Gem,
  Cat,
  Dog,
  Fish,
  Bird
} from 'lucide-react';

export const AVATAR_LIST = [
  'user', 'ghost', 'robot', 'swords', 'shield', 'flame', 'zap', 'target', 'star', 'crown',
  'heart', 'skull', 'anchor', 'cloud', 'moon', 'sun', 'eye', 'smile', 'gamepad', 'trophy',
  'coffee', 'music', 'camera', 'feather', 'umbrella', 'rocket', 'wand', 'gem', 'cat', 'dog', 'fish', 'bird'
];

interface UserAvatarProps {
  type?: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ type, size = 16, className = "" }: UserAvatarProps) {
  switch (type) {
    case 'ghost': return <Ghost size={size} className={className} />;
    case 'robot': return <Bot size={size} className={className} />;
    case 'swords': return <Swords size={size} className={className} />;
    case 'shield': return <Shield size={size} className={className} />;
    case 'flame': return <Flame size={size} className={className} />;
    case 'zap': return <Zap size={size} className={className} />;
    case 'target': return <Target size={size} className={className} />;
    case 'star': return <Star size={size} className={className} />;
    case 'crown': return <Crown size={size} className={className} />;
    case 'heart': return <Heart size={size} className={className} />;
    case 'skull': return <Skull size={size} className={className} />;
    case 'anchor': return <Anchor size={size} className={className} />;
    case 'cloud': return <Cloud size={size} className={className} />;
    case 'moon': return <Moon size={size} className={className} />;
    case 'sun': return <Sun size={size} className={className} />;
    case 'eye': return <Eye size={size} className={className} />;
    case 'smile': return <Smile size={size} className={className} />;
    case 'gamepad': return <Gamepad2 size={size} className={className} />;
    case 'trophy': return <Trophy size={size} className={className} />;
    case 'coffee': return <Coffee size={size} className={className} />;
    case 'music': return <Music size={size} className={className} />;
    case 'camera': return <Camera size={size} className={className} />;
    case 'feather': return <Feather size={size} className={className} />;
    case 'umbrella': return <Umbrella size={size} className={className} />;
    case 'rocket': return <Rocket size={size} className={className} />;
    case 'wand': return <Wand size={size} className={className} />;
    case 'gem': return <Gem size={size} className={className} />;
    case 'cat': return <Cat size={size} className={className} />;
    case 'dog': return <Dog size={size} className={className} />;
    case 'fish': return <Fish size={size} className={className} />;
    case 'bird': return <Bird size={size} className={className} />;
    default: return <User size={size} className={className} />;
  }
}
