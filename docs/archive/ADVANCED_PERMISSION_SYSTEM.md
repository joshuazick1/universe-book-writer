# Advanced Permission & Collaboration System Design - REFINED

## Overview
This document outlines the sophisticated permission system for the VerseForge, refined based on specific requirements for flexible contribution models, comprehensive spoiler protection, and collaborative encryption.

## Core Principles - UPDATED

1. **Universe Owner Authority**: Universe creators have ultimate control over contribution policies and oversight
2. **Content Creator Freedom**: Writers can create any content; conflicts labeled as non-canon rather than restricted
3. **Flexible Canon System**: Canon conflicts result in labeling (non-canon, alternate timeline) not content blocking
4. **Comprehensive Spoiler Protection**: Multi-level spoiler protection with private diff storage and AI-driven dynamic content
5. **Collaborative Encryption**: Universe owners and individual book owners control encryption keys and access

## Refined Permission Matrix

### Universe-Level Permissions - UPDATED

```typescript
interface UniversePermissions {
  // Core universe control
  owner_id: string;
  
  // Contribution control - REFINED
  contribution_policy: {
    allow_contributions: boolean;           // Can others create books?
    require_approval: boolean;              // Must owner approve new books?
    canon_enforcement: 'flexible' | 'labeling_only' | 'none'; // Removed 'strict'
    oversight_level: 'none' | 'review' | 'approval_optional'; // Owner choice
    book_ownership: 'creator' | 'shared_with_universe'; // Who owns content created
  };
  
  // Privacy settings
  privacy: {
    is_private: boolean;                    // Universe visibility
    was_ever_public: boolean;               // Irreversible flag
    contributor_access: 'public' | 'invited' | 'owner_only';
  };
  
  // Encryption settings - REFINED
  encryption: {
    shared_encryption_enabled: boolean;     // Use universe-wide encryption
    universe_key_controlled_by: 'owner_only' | 'owner_and_book_owners'; // Key control
    key_rotation_policy: 'manual' | 'on_contributor_removal' | 'owner_discretion';
    encryption_inheritance: 'universe_default' | 'book_owner_choice'; // Default for new books
  };
}
```

### Book-Level Permissions - UPDATED

```typescript
interface BookPermissions {
  // Core book control
  owner_id: string;
  universe_id: string;
  
  // Privacy & Publication - REFINED
  privacy: {
    status: 'private' | 'contributors_only' | 'public' | 'published';
    was_ever_public: boolean;               // Irreversible flag
    publication_date?: Date;                // When it becomes public
    universe_privacy_inherited: boolean;    // Follows universe settings
    owner_override_allowed: boolean;        // Book owner can override universe settings
  };
  
  // Canon status - REFINED (No restriction, only labeling)
  canon_status: {
    is_canon: boolean;                      // Owner-determined canon status
    canon_level: 'official' | 'semi_canon' | 'non_canon' | 'alternate_timeline';
    conflicts_with: CanonConflict[];        // Detailed conflict info
    universe_owner_opinion: 'approved' | 'non_canon' | 'alternate' | 'no_opinion';
    conflict_resolution: 'accepted' | 'labeled_non_canon' | 'alternate_timeline';
  };
  
  // Spoiler protection - ENHANCED
  spoiler_protection: {
    enabled: boolean;
    protection_level: 'minimal' | 'moderate' | 'maximum';
    embargo_until?: Date;                   // Content release date
    character_development_private: boolean;  // Hide character changes
    location_details_private: boolean;      // Hide new location info
    plot_points_private: boolean;           // Hide major plot developments
    ai_dynamic_content_enabled: boolean;    // AI generates dynamic content
    diff_storage_private: boolean;          // Store diffs privately until published
  };
  
  // Collaboration - ENHANCED
  collaboration: {
    contributors: BookContributor[];        // Enhanced contributor info
    collaboration_type: 'read' | 'comment' | 'edit';
    shared_with_universe: boolean;          // Visible to universe contributors
    encryption_controlled_by: 'book_owner' | 'universe_owner' | 'both'; // Key control
  };
}

interface CanonConflict {
  conflicting_book_id: string;
  conflict_type: 'character_inconsistency' | 'timeline_conflict' | 'lore_contradiction' | 'setting_mismatch';
  conflict_description: string;
  resolution_strategy: 'label_non_canon' | 'alternate_timeline' | 'semi_canon' | 'ignore';
  detected_by: 'ai' | 'user_report' | 'owner_review';
}
```

## Enhanced Spoiler Protection System

### Private Diff Storage & Dynamic Content - UPDATED

```typescript
interface ContentDiff {
  id: string;
  book_id: string;
  content_type: 'character' | 'location' | 'plot' | 'lore' | 'technology';
  
  // Change tracking - ENHANCED
  changes: {
    entity_id: string;                      // Character/Location/etc ID
    change_type: 'created' | 'modified' | 'revealed' | 'developed';
    previous_state?: any;                   // Before this book
    new_state: any;                         // After this book
    ai_generated: boolean;                  // Was this AI-generated content?
    triggers_spoiler: boolean;              // Does this change create spoilers?
    spoiler_categories: SpoilerCategory[];  // What types of spoilers
  }[];
  
  // Privacy control - REFINED
  visibility: {
    is_private: boolean;                    // Stored privately until published
    revealed_when_published: boolean;       // Auto-reveal when book goes public
    auto_reveal_date?: Date;                // Automatic reveal date
    manual_reveal_only: boolean;            // Owner must manually reveal
    affects_other_books: boolean;           // Changes visible to other private books?
  };
  
  // AI-driven dynamic content - NEW
  ai_dynamic_generation: {
    enabled: boolean;                       // Generate dynamic content for spoiler protection
    generate_for_private_books: boolean;    // Each private book gets separate AI content
    merge_on_publication: boolean;          // Merge AI content when published
    conflict_resolution: 'ai_assisted' | 'manual' | 'owner_decides';
  };
  
  // Spoiler protection - ENHANCED
  spoiler_tags: string[];                   // Custom spoiler categories
  spoiler_level: 1 | 2 | 3 | 4 | 5;       // 1=minor, 5=major spoiler
  protection_until: Date | 'manual';       // When protection expires
}
```

### AI-Driven Dynamic Content - ENHANCED

```typescript
interface DynamicContentGeneration {
  // Character development - SEPARATE PER PRIVATE BOOK
  character_evolution: {
    base_character_id: string;
    book_specific_changes: Record<string, CharacterState>;
    ai_generated_traits: AIGeneratedTrait[];
    development_timeline: CharacterDevelopmentEvent[];
    private_book_variations: Record<string, CharacterState>; // NEW: Separate for each private book
    merge_conflicts: CharacterMergeConflict[];              // NEW: Track conflicts for publication
  };
  
  // Location expansion - SEPARATE PER PRIVATE BOOK
  location_details: {
    base_location_id: string;
    book_specific_details: LocationDetails;
    discovered_areas: DiscoveredArea[];
    private_book_variations: Record<string, LocationDetails>; // NEW: Separate for each private book
    public_reference_only: boolean;                           // NEW: Only reference public data
  };
  
  // Plot point revelation - PRIVATE BOOK ISOLATION
  plot_development: {
    plot_thread_id: string;
    revelations: PlotRevelation[];
    foreshadowing: ForeshadowingElement[];
    spoiler_protection_active: boolean;
    private_book_isolation: boolean;                          // NEW: Isolate development per book
    public_reference_base: PublicPlotState;                   // NEW: Base state from public content
  };
}

interface CharacterMergeConflict {
  character_id: string;
  conflicting_books: string[];              // Books with different character development
  conflict_type: 'trait_conflict' | 'timeline_conflict' | 'relationship_conflict';
  ai_suggested_resolution: MergeResolution;
  requires_manual_resolution: boolean;
}
```
```

## Refined Encryption Architecture

### Multi-Scope Encryption - UPDATED

```typescript
interface EncryptionScope {
  // Personal content (fully private)
  user_private: {
    user_id: string;
    salt: string;
    scope: 'user_only';
    content_types: ['drafts', 'personal_notes', 'private_characters'];
    key_control: 'user_only';               // Only user controls this key
  };
  
  // Universe collaboration - REFINED
  universe_shared: {
    universe_id: string;
    shared_key_id: string;
    contributors: UniverseContributor[];
    scope: 'universe_contributors';
    content_types: ['shared_lore', 'collaborative_worldbuilding'];
    key_control: 'universe_owner' | 'universe_owner_and_book_owners'; // REFINED
    key_revocation: 'universe_owner_only' | 'individual_user_revokable'; // REFINED
  };
  
  // Book-specific access - REFINED  
  book_collaborative: {
    book_id: string;
    access_key_id: string;
    collaborators: BookCollaborator[];
    scope: 'book_collaborators';
    content_types: ['shared_chapters', 'collaborative_editing'];
    key_control: 'book_owner' | 'book_owner_and_universe_owner'; // REFINED
    encryption_inheritance: 'from_universe' | 'independent';      // REFINED
  };
  
  // Published content (no encryption)
  public_content: {
    scope: 'public';
    content_types: ['published_books', 'public_lore', 'canon_content'];
    irreversible_public: boolean;           // Cannot be re-encrypted once public
  };
}

interface UniverseContributor {
  user_id: string;
  access_level: 'read' | 'contribute' | 'co_owner';
  encryption_key_access: boolean;
  joined_date: Date;
  can_invite_others: boolean;
  key_revocation_policy: 'owner_only' | 'self_revokable'; // REFINED
}

interface BookCollaborator {
  user_id: string;
  role: 'reader' | 'editor' | 'co_author';
  permissions: string[];
  access_granted_by: string;               // User ID who granted access
  access_date: Date;
  key_access_level: 'read_only' | 'full_access'; // REFINED
}
```

### Key Management - REFINED

```typescript
interface KeyManagement {
  // Universe-level keys - REFINED
  universe_keys: {
    universe_id: string;
    current_key_version: number;
    encryption_key: string;                 // Encrypted with owner's key
    key_shares: KeyShare[];                 // For key recovery
    rotation_schedule?: Date;
    key_controllers: string[];              // Universe owner + optional book owners
    revocation_authority: 'owner_only' | 'distributed'; // REFINED
  };
  
  // User access to universe keys - REFINED
  user_universe_access: {
    user_id: string;
    universe_id: string;
    encrypted_universe_key: string;         // Universe key encrypted with user's key
    access_level: 'read' | 'write' | 'admin';
    granted_by: string;                     // User ID
    granted_date: Date;
    revocation_policy: 'owner_only' | 'self_revokable'; // REFINED
    key_cannot_be_revoked: boolean;         // For owner keys
  };
  
  // Key rotation and revocation - REFINED
  key_rotation: {
    trigger: 'manual' | 'contributor_removed' | 'owner_discretion'; // REFINED
    old_key_version: number;
    new_key_version: number;
    affected_content: string[];             // Content IDs that need re-encryption
    rotation_date: Date;
    content_handling: 'clone_to_contributor' | 'remove_from_server'; // REFINED
  };
}
```
  role: 'reader' | 'editor' | 'co_author';
  permissions: string[];
  access_granted_by: string;               // User ID who granted access
  access_date: Date;
}
```

### Key Management

```typescript
interface KeyManagement {
  // Universe-level keys
  universe_keys: {
    universe_id: string;
    current_key_version: number;
    encryption_key: string;                 // Encrypted with owner's key
    key_shares: KeyShare[];                 // For key recovery
    rotation_schedule?: Date;
  };
  
  // User access to universe keys
  user_universe_access: {
    user_id: string;
    universe_id: string;
    encrypted_universe_key: string;         // Universe key encrypted with user's key
    access_level: 'read' | 'write' | 'admin';
    granted_by: string;                     // User ID
    granted_date: Date;
  };
  
  // Key rotation and revocation
  key_rotation: {
    trigger: 'manual' | 'contributor_removed' | 'security_breach' | 'scheduled';
    old_key_version: number;
    new_key_version: number;
    affected_content: string[];             // Content IDs that need re-encryption
    rotation_date: Date;
  };
}
```

## Content Reference Rules - REFINED

### Cross-Content References

```typescript
interface ContentReference {
  // What can reference what - REFINED
  reference_rules: {
    private_to_private: false;              // Private books CANNOT reference other private content
    private_to_public: true;                // Private books CAN reference public content  
    public_to_private: false;               // Public books CANNOT reference private content
    collaborative_to_shared: boolean;       // Collaborative content can reference shared universe content
    universe_granular_control: boolean;    // Universe owner can set granular reference rules
  };
  
  // Character development isolation - REFINED
  character_isolation: {
    separate_development_trees: true;       // Each private book has SEPARATE character development
    merge_on_publication: boolean;          // Character development merges when book goes public
    conflict_resolution: 'manual' | 'ai_assisted' | 'owner_decides';
    ai_generates_separate_traits: boolean;  // AI creates different traits for each private book
    public_base_only: boolean;              // Private books only see public character state as base
  };
  
  // Location consistency - REFINED
  location_consistency: {
    shared_locations_always_public: boolean; // Core universe locations are public reference base
    private_location_additions: boolean;    // Books can add private location details
    location_contradiction_handling: 'separate_version' | 'owner_review' | 'ai_assisted_merge';
    private_books_see_public_only: boolean; // Private books only see public location state
  };
  
  // Privacy hierarchy enforcement - NEW
  privacy_hierarchy: {
    universe_owner_sets_default: boolean;   // Universe settings can set defaults
    book_owner_can_override: boolean;       // Book owners can override universe settings
    granular_permission_control: boolean;   // Fine-grained control over what content belongs to whom
    content_ownership_on_creation: 'book_owner' | 'universe_shared' | 'configurable';
  };
}
```

## Implementation Phases - UPDATED

### Phase A.2 (Current): Advanced Foundation
- **Universe-level privacy controls** with owner authority and flexible contribution policies
- **Advanced encryption** with multi-scope architecture (user/universe/book level)
- **Flexible contribution permissions** with canon labeling instead of restrictions
- **Spoiler protection foundation** with private diff storage architecture
- **Irreversible public status** implementation for universes and books

### Phase A.3: Enhanced Content Management  
- **Book-level privacy controls** with inheritance from universe settings
- **Content diff tracking system** for comprehensive spoiler protection
- **AI integration for dynamic content** generation per private book
- **Cross-reference validation** with privacy-aware restrictions
- **Canon labeling and conflict resolution** system
- **Collaborative editing** with permission-aware access controls

### Phase B: Comprehensive Security & Collaboration
- **Full multi-scope encryption** with key management and rotation
- **Advanced key management** with revocation policies and owner protection
- **Sophisticated spoiler protection** with AI-driven dynamic content generation
- **Real-time collaboration features** with permission validation
- **Security testing** for all permission boundaries and encryption scopes

### Phase C: AI-Enhanced Features
- **AI-driven character development** with separate evolution per private book
- **Automatic spoiler detection** and protection
- **Intelligent content suggestions** respecting privacy and permission boundaries
- **Advanced conflict resolution** for canon disputes and character merging
- **AI-assisted content merging** when books transition to public status

## Security Considerations - REFINED

1. **Encryption Key Security**
   - **Universe keys**: Controlled by universe owner, optionally shared with book owners
   - **Key rotation**: Triggered by owner discretion or contributor removal
   - **Owner key protection**: Universe/book owner keys cannot be revoked
   - **Content preservation**: When owner removed, content cloned to contributor or removed

2. **Access Control**
   - **Granular permissions** at universe and book levels with owner override capability
   - **Audit trails** for all permission changes and key operations
   - **Secure key sharing** with revocation policies and owner protection

3. **Content Isolation**
   - **Private content isolation**: Private books cannot reference other private content
   - **Public content immutability**: Public content cannot be re-encrypted
   - **Clear separation** between collaboration scopes and privacy levels

4. **Spoiler Protection**
   - **Private diff storage**: All content changes stored privately until publication
   - **AI dynamic content**: Separate character/location development per private book
   - **Temporal access controls**: Content embargoes and staged revelation
   - **User-controlled exposure**: Granular spoiler protection settings
