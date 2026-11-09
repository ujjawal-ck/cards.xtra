# Component Specs — mini-app (extracted from Figma)

Real specifications pulled from the Figma file (P7UcoZYBnfyefmJIA8wcM7). Build to THESE
exact dimensions. Every raw number maps to a token in src/tokens — use the token, not the
literal (radius 12 -> radius.lg; padding 16 -> spacing[16]; height 48 -> sizing.inputHeight;
font via typography.*). Colors via the SEMANTIC layer only.

Notation: WxH size, r# cornerRadius, p[t/r/b/l] padding, g# gap, H/V layout.

## Button  [81:21192]
Variants: Style(Solid|Destructive|Ghost|Link|Outline|Subtle), Color(Main|Second),
Size(36|44|52 heights), State(Default|Disabled), Icon(None|Leading|Trailing|Only), Width(Hug|Fill).
- radius 8 (radius.sm); height 36/44/52; h-padding 24 (footer CTAs 32); icon-to-label gap 4
- icon 16x16 (size52 -> 20); Fill stretches to container; Hug wraps; loading overlay (16 loader)
- Props: variant(primary=Solid/Main Saffron | secondary=Solid/Second Cobalt | tertiary=Subtle | outline | ghost | link | destructive),
  size('sm'36|'md'44|'lg'52), iconPosition('none'|'leading'|'trailing'|'only'), fullWidth, disabled, loading
- primary bg colors.action.primary.default, text colors.action.primary.text

## Text
Wrapper over RN Text: variant = any key of typography (e.g. heading20SemiBold, body14Regular),
color (default colors.text.primary). No hardcoded font props.

## Input (Text Field)  [425:24469]
State(Unfilled|Filled|Selected|Error|Disabled), Size(md|sm), Leading(T/F), Trailing(T/F).
- box height 48, radius 12, p-left 16, p-right 12, inner gap 8
- wrapper vertical gap 4 (box + hint row 16h); supports floating label (phone field)
- border 1px: default border.default, focused border.focussed, error feedback.error.border
- Props: value,onChangeText,label,placeholder,state,size,leadingIcon,trailingIcon,hint

## OtpBox  [426:23735]
State(Default|Focused|Filled|Disabled|Error), Size(4|6 digits), Resend(Hidden|Timer|Ready).
- each slot 65x56, radius 12, border 1px, gap 12; focused border border.focussed
- below: optional hint + Resend row (gap 8). Login uses 4 digits + "Resend OTP in: 30s"
- Props: length(4|6),value,onChange,state,resend,secondsLeft

## Tag / Badge  [3010:1106]
- Status tag: radius full (pill) or default, p[8/16/8/12], gap 8, 12px dot + text
- Category badge (on CardTile): radius 4, p[2/8/2/8], gap 4, body12 text
- Cashback pill: radius full, p[4/12/4/12]; bg cashback.subtle (Saffron50), text cashback.default (Saffron500)
- Props: variant('status'|'category'|'cashback'), tone, label, dot?, pill?

## Chip  [3234:2]
Type(Toggle|Default|Tab), State(Default|Selected|Disabled), Size(20|24|28|32).
- radius 8, p[8/12/8/12] (size32), gap 8; optional toggle (24x16 r.full) or edit icon (12)
- Props: label,type,state,size,onPress. Used for filter chips.

## SearchBar  [1857:43005]
States Default | Filled (back+close) | Expanded.
- bar height 48, radius 12, p[0/16/0/16], gap 12, search icon 20x20
- Props: value,onChangeText,placeholder,state. Used on Home and Offers.

## CardTile  [home 1929:31104]  *** hero molecule
Container 328x242, radius 16, padding 12, gap 12, vertical:
1. Card row (H gap8): card image 132x84 r10 + Card Info (V gap6): name body16SemiBold (2 lines) + cashback pill
2. optional INVITE ONLY ribbon
3. Tags row (H gap8): 2-3 category badges (r4): Shopping, Airport Lounge, Fuel
4. Benefits (V gap8): rows of [16 icon + body12 text]
5. Base strip (H r8 gap8): Fee container [Joining | divider | Annual, Rs values] + Apply Now Button (36h r8, chevron trailing, Saffron)
Whole tile tappable -> opens CardDetailSheet. Props: card{name,image,cashback,tags,benefits,joiningFee,annualFee}, onPress.

## PartnerCard  [offers 4439:291381]
White card radius ~16, padding ~12: brand logo/name + product image + full-width blue button
"Shop & Earn upto X%" (action.accent Cobalt). 2-col grid. Props: partner{name,logo,image,rate}, onPress.

## FilterRow (Home)
H row: Category Chip (dropdown), Filters Chip (filter icon), Eligibility toggle (label + switch). gap 8-12.

## CategoryCircle
V: circular image ~64-72 (r.full) + body12 label. Horizontal scroll.

## CardList (Home)
Vertical list of CardTile, gap 16, side padding 16, with category carousel interleaved after first 2 tiles.

## PartnerGrid (Offers)
2-column grid of PartnerCard, gap 12, side padding 16.

## BottomNav  [394:23561]
Floating PILL: radius full, height 56, p[8/40/8/40], item gap 12, dark surface (surface.inverse).
4 tabs Home/Offers/Earnings/Profile: 20px icon + 14px label, gap 2. Active highlighted, inactive muted.

## CardDetailSheet  [base 2906:260105]  *** NON-NEGOTIABLE
@gorhom/bottom-sheet, snap points ~[58%, 96%]. Opens at LOWER snap over Home; first upward
scroll/drag expands to TOP snap (full screen) — Blinkit pattern. Use BottomSheetScrollView.
Content: drag handle, card hero + name, cashback pill, benefits grid (2-col), "Best for spending on"
row (3 items), fees block (Annual/Joining Rs), STICKY footer "Apply Now" (Single, 44h, r12, p32, Saffron, shadow). Footer node 3657:2.

## Screens
- LoginScreen [4439:291374]: navy->teal gradient hero, faded "Find The Perfect Card in Seconds", Cards.xtra logo, model image; white sheet: "Log in or Sign up", subtitle, phone Input (label), Get OTP Button (Fill Saffron), terms footer. Get OTP -> Otp.
- OtpScreen: same hero; "Enter OTP", "Sent to 98945-72087 Change" (Change=accent link), OtpBox 4, "Resend OTP in: 30s", Submit Button -> MainTabs.
- HomeScreen [4439:291375]: blue->purple gradient header (logo + bell badge 9), "Earn Upto Rs2,000 Cashback / on 50+ Premium Cards" with floating cards, SearchBar, FilterRow, CardList. Tap CardTile -> CardDetailSheet. BottomNav.
- OffersScreen [4439:291381]: orange header (~#ff5722) + SearchBar, horizontal CategoryCircles (New on CashKaro/Fashion/Food & Grocery/Health & Wellness/Flights & Travel), PartnerGrid (Amazon 5%, Flipkart 4%, Reliance Digital 4%, Ajio 4%). BottomNav.
- EarningsScreen: "No earnings yet" empty state, on-brand. Navigable.
- ProfileScreen: avatar + name + phone, then menu rows (Payment History, Help, Privacy Policy) with icon + label + chevron. Navigable.

## Placeholder data
Cards: AXIS MyZone, HDFC Regalia Gold, SBI Cashback, ICICI Amazon Pay, Axis Atlas. Cashback "Upto Rs1200",
fees "Rs1,501". Categories: Shopping, Airport Lounge, Fuel, Dining, Food Ordering. Partners: Amazon 5%,
Flipkart 4%, Reliance Digital 4%, Ajio 4%, Foxtale 4%, Times Prime 4%. Use Image/Cards/* if accessible,
else clean colored placeholder rectangles with the bank name. NEVER broken image refs.
