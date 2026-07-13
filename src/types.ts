export interface User {
  id: string;
  username: string;
  theme?: string;
  card_style?: string;
  card_back_style?: string;
  card_back_color?: string;
  card_back_secondary_color?: string;
  avatar?: string;
  mute_sounds?: number;
  sound_volume?: number;
  time_zone?: string;
  time_format?: '12h' | '24h';
  show_date?: number;
  show_move_date?: number;
  is_admin?: number;
  sound_profile?: string;
  ui_scale?: number;
  card_scale?: number;
}

export interface Card {
  id?: string;
  suit: string;
  value: string;
  is_face_up?: boolean;
  player_id?: string;
  card_index?: number;
}

export interface Move {
  id: string;
  game_id: string;
  player_id: string;
  move_type: string;
  card_affected_index: number;
  card_suit: string;
  card_value: string;
  replaced_card_suit?: string;
  replaced_card_value?: string;
  snapshot_json?: string;
  round_number?: number;
  timestamp: string;
}

export interface GameState {
  game: {
    id: string;
    room_code: string;
    player1_id: string;
    player2_id: string | null;
    is_vs_cpu: boolean;
    current_turn_player_id: string;
    status: string;
    deck_count: number;
    discard: Card[];
    player1_total_score: number;
    player2_total_score: number;
    cpu_difficulty: 'easy' | 'normal' | 'hard';
    winner_player_id: string | null;
    player1_name?: string;
    player1_avatar?: string;
    player1_card_style?: string;
    player1_card_back_style?: string;
    player1_card_back_color?: string;
    player1_card_back_secondary_color?: string;
    player2_name?: string;
    player2_avatar?: string;
    player2_card_style?: string;
    player2_card_back_style?: string;
    player2_card_back_color?: string;
    player2_card_back_secondary_color?: string;
  };
  cards: Card[];
  moves: Move[];
}
