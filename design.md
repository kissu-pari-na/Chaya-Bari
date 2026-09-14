# Design System --- Dark Luxury Food (Ember: Red + Gold on Black)

## 1. Design Direction

Create a premium, modern food-ordering experience inspired by dark
luxury restaurant interfaces — a near-black canvas lit by a bold **crimson
red** and a warm **amber gold**, over frosted-glass surfaces.

**Core feeling:** premium, appetizing, bold, confident, modern.

Avoid: - Cheap fast-food red/yellow (keep the red deep and the gold refined,
never neon) - Excessive gradients - Overly decorative UI - Crowded layouts

## 2. Color Palette

Two accents on a neutral near-black:

- **Red** is the primary brand action — buttons, active nav, focus,
  arrows, the logo.
- **Gold** is the highlight/positive tone — prices, ratings, values, a
  secondary "confirm" button, success confirmations.
- Surfaces are frosted **dark glass** (translucent white over the dark).

``` text
Primary Background:   #0B0B0C   (neutral near-black)
Secondary Dark:       #161416
Deep Red (panels):    #7A1C17
Accent Red:           #E4322B   (primary action)
Bright Red (hover):   #FF4A3D
Amber Gold:           #F5B300   (highlights, values, secondary CTA)
Bright Gold:          #FFC633
Warm Cream:           #F5F1E7   (text on dark)
Muted Text:           #B8B9B2
Border:               #2A2626
```

Use dark backgrounds for hero, navigation, trust sections, and premium
promotional areas; frosted dark-glass cards throughout. Documents
(invoices/receipts) still print on a clean white sheet.

## 3. Typography

Use a clean modern sans-serif for UI.

Recommended: - Primary: Inter, Manrope, or Plus Jakarta Sans - Optional
display/accent: a tasteful serif or handwritten font for short
food-brand phrases only

Typography hierarchy: - Hero: 56--72px, bold - Section heading:
30--40px, bold - Card title: 18--22px, semibold - Body: 15--17px -
Small/meta: 12--14px

Keep typography highly readable and avoid using decorative fonts for
large amounts of text.

## 4. Layout

Use a spacious, premium layout with a maximum content width around
1200--1400px.

Typical structure:

1.  Sticky navigation
2.  Dark hero section
3.  Food categories
4.  Featured dishes
5.  Combo / promotional section
6.  Why choose us
7.  Customer reviews
8.  Delivery benefits
9.  Footer

Use generous spacing and clear visual separation between sections.

## 5. Hero Section

The hero should be visually dominant.

Include: - Short trust label such as `100% HOMEMADE` - Strong headline -
Short supporting description - Primary CTA: `Order Now` - Secondary CTA:
`View Menu` - Large, high-quality food photograph - Rating/trust badge

Example messaging:

**Authentic Homemade Food**\
*Made Fresh, Just Like Home*

The food photograph should occupy roughly 45--55% of the hero and feel
rich, warm, and appetizing.

## 6. Navigation

Dark, minimal, and uncluttered.

Include: - Logo - Home - Menu - Combo Deals - About - Reviews -
Contact - Search - Account - Cart

Use **red** for active states and important actions; **gold** for highlights, values, and ratings.

## 7. Food Cards

Cards should feel premium but simple.

Each card can contain: - Food image - Bestseller/new badge when
relevant - Food name - Short description - Price - Add-to-cart button -
Optional rating

Use rounded corners around 12--18px and subtle borders/shadows.

## 8. Buttons

Primary: - Red background (`#E4322B`) - White readable text - Rounded
10--14px - Warm hover (brighter red / gold glow)

Secondary / confirm: - Gold background (`#F5B300`) with near-black text, for
one clear "confirm" action per view

Tertiary: - Transparent/dark background - Cream border - Cream text

Cart/add buttons should be compact and highly recognizable.

## 9. Imagery

Food photography is a major part of the design.

Prefer: - Close-up dishes - Natural ingredients - Warm lighting -
Dark/moody backgrounds for hero imagery - Clean neutral backgrounds for
product cards - Realistic photography rather than generic illustrations

Images should make the food look freshly prepared and premium.

## 10. Trust & Brand Messaging

Emphasize the homemade advantage.

Possible features: - 100% Homemade - Fresh Ingredients - Made With
Love - Hygienic & Safe - Home-Style Taste - Fast Delivery

Use simple line icons with the red/gold accent.

## 11. Promotional Section

Use a deep-red/dark promotional panel rather than a bright advertising
banner.

Example:

**Best Combos\
Save More!**

Show: - Combo image - Original price - Discounted price - Discount
badge - CTA

## 12. Reviews

Use dark cards with subtle borders.

Display: - Customer name - Avatar - Star rating - Short review

Keep reviews visually clean and authentic.

## 13. Responsive Design

### Desktop

-   Large hero
-   3--4 food cards per row
-   Full navigation
-   Spacious sections

### Tablet

-   2--3 cards per row
-   Condensed navigation
-   Reduced hero typography

### Mobile

-   Hamburger navigation
-   Hero image stacked or partially overlapping
-   1--2 cards per row
-   Sticky cart/order CTA when appropriate
-   Large touch targets
-   Avoid horizontal overflow

## 14. Interaction

Use subtle motion only.

Recommended: - Card image scale on hover - Button hover/press feedback -
Smooth section transitions - Cart count animation - Image fade/slide
transitions

Avoid excessive animation that distracts from ordering.

## 15. Component Style

Use a consistent component language:

-   Border radius: 12--18px
-   Buttons: 10--14px
-   Cards: 14--18px
-   Thin borders
-   Subtle shadows
-   Consistent icon stroke width
-   Consistent spacing scale

## 16. Overall Rule

The website should feel like:

**A premium homemade-food brand --- not a generic restaurant template.**

Prioritize: **Food photography → readability → trust → easy ordering →
premium visual identity.**
