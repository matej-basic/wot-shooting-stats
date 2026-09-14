#!/usr/bin/env python3
"""
World of Tanks Replay File Structure Analyzer

Decodes .wotreplay files to extract blocks and analyze event streams.

File Structure:
  - Bytes 0x00-0x03: Magic header
  - Bytes 0x04-0x07: Block count (little-endian uint32)
  - Bytes 0x08+: Repeating blocks of [4-byte LE length][data]

Blocks typically:
  - Block 0: JSON - battle metadata 
  - Block 1: JSON - statistics (personal stats, per-enemy details)
  - Block 2: Binary - event stream (encrypted/not directly decodable)

The event statistics are available aggregated in Block 1 JSON under:
  - personal['details']: per-enemy combat stats
  - personal: overall stats (shots, kills, assists)

References:
  - https://github.com/Monstrofil/replays_unpack
"""

import struct
import json
import zlib


class ReplayStructureAnalyzer:
    """Analyzes WoT replay file structure"""
    
    def __init__(self, replay_path):
        with open(replay_path, 'rb') as f:
            self.data = f.read()
        self.blocks = []
        self.parse_structure()
    
    def parse_structure(self):
        if len(self.data) < 8:
            raise ValueError("File too small")
        
        block_count = struct.unpack('<I', self.data[0x04:0x08])[0]
        offset = 0x08
        
        for i in range(block_count):
            if offset + 4 > len(self.data):
                break
            
            block_len = struct.unpack('<I', self.data[offset:offset+4])[0]
            block_data_start = offset + 4
            block_data = self.data[block_data_start:block_data_start+block_len]
            
            self.blocks.append({
                'index': i,
                'offset': offset,
                'length': block_len,
                'data': block_data,
                'type': self._detect_block_type(block_data)
            })
            
            offset += 4 + block_len
    
    def _detect_block_type(self, data):
        if len(data) == 0:
            return "empty"
        if data[0:1] in (b'{', b'['):
            return "json"
        if data[0:2] in (b'\x78\x9c', b'\x78\xda'):
            return "zlib_compressed"
        if data[0] == 0x80:
            return "pickle"
        return "binary_unknown"
    
    def print_structure(self):
        print("WoT Replay File Structure")
        print("=" * 60)
        print(f"Total file size: {len(self.data):,} bytes (0x{len(self.data):x})")
        print(f"Number of blocks: {len(self.blocks)}")
        print()
        
        for block in self.blocks:
            print(f"Block {block['index']}:")
            print(f"  Offset: 0x{block['offset']:x} ({block['offset']:,})")
            print(f"  Length: 0x{block['length']:x} ({block['length']:,} bytes)")
            print(f"  Type: {block['type']}")
            
            if block['type'] == 'json':
                try:
                    text = block['data'].decode('utf-8', errors='ignore')
                    decoder = json.JSONDecoder()
                    pos = 0
                    count = 0
                    keys_list = []
                    
                    while pos < len(text) and count < 5:
                        match = text.find('{', pos)
                        if match == -1:
                            break
                        try:
                            obj, end_idx = decoder.raw_decode(text[match:])
                            keys_list.append(list(obj.keys())[:3])
                            count += 1
                            pos = match + end_idx
                        except json.JSONDecodeError:
                            pos = match + 1
                    
                    print(f"  Content: {count} JSON objects")
                    for i, keys in enumerate(keys_list):
                        print(f"    Object {i+1} keys: {keys}")
                except:
                    print(f"  Content: (decode error)")
            else:
                print(f"  Content: {block['type']} (first 32 bytes: {block['data'][:32].hex()})")
            
            print()
    
    def extract_event_statistics(self):
        result = {"summary": None, "per_enemy_details": None}
        
        for block in self.blocks:
            if block['type'] == 'json':
                try:
                    text = block['data'].decode('utf-8', errors='ignore')
                    decoder = json.JSONDecoder()
                    pos = 0
                    
                    while pos < len(text):
                        match = text.find('{', pos)
                        if match == -1:
                            break
                        try:
                            obj, end_idx = decoder.raw_decode(text[match:])
                            if isinstance(obj, dict) and 'personal' in obj:
                                player_id = list(obj['personal'].keys())[0] if obj['personal'] else None
                                if player_id:
                                    personal = obj['personal'][player_id]
                                    result['summary'] = {
                                        'shots': personal.get('shots', 0),
                                        'direct_hits': personal.get('directHits', 0),
                                        'piercings': personal.get('piercings', 0),
                                        'damage_dealt': personal.get('damageDealt', 0),
                                        'damage_received': personal.get('damageReceived', 0),
                                        'kills': personal.get('kills', 0),
                                        'assists_track': personal.get('damageAssistedTrack', 0),
                                        'assists_radio': personal.get('damageAssistedRadio', 0),
                                    }
                                    if 'details' in personal:
                                        details = {}
                                        for enemy_key, stats in personal['details'].items():
                                            details[enemy_key] = {
                                                'direct_hits': stats.get('directHits', 0),
                                                'piercings': stats.get('piercings', 0),
                                                'damage_dealt': stats.get('damageDealt', 0),
                                            }
                                        result['per_enemy_details'] = details
                                    return result
                            pos = match + end_idx
                        except json.JSONDecodeError:
                            pos = match + 1
                except:
                    pass
        
        return result


def main():
    import sys
    if len(sys.argv) < 2:
        print("Usage: python event_parser.py <replay_file>")
        sys.exit(1)
    
    analyzer = ReplayStructureAnalyzer(sys.argv[1])
    analyzer.print_structure()
    
    stats = analyzer.extract_event_statistics()
    print("=" * 60)
    print("Event Statistics")
    print("=" * 60)
    if stats['summary']:
        print("\nSummary:")
        for k, v in stats['summary'].items():
            print(f"  {k}: {v}")
    if stats['per_enemy_details']:
        print(f"\nPer-Enemy ({len(stats['per_enemy_details'])} enemies):")
        for key, det in sorted(stats['per_enemy_details'].items()):
            print(f"  {key}: hits={det['direct_hits']}, pierce={det['piercings']}, dmg={det['damage_dealt']}")


if __name__ == "__main__":
    main()
