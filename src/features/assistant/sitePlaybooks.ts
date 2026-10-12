type Playbook = { kind: string; examples: string; pages: string; home: string };

const PLAYBOOKS: readonly Playbook[] = [
  {
    kind: 'Local trade',
    examples: 'plumber, electrician, roofer, cleaner, locksmith, gardener',
    pages: 'Home, Services, About, Contact',
    home: 'hero with phone number and a call-out promise > emergency call strip > services > licences, insurance and memberships > how a job works > recent jobs or before and after > reviews > price guide > towns served > guarantee > common questions > long text about the service in the area > contact with map and opening hours > final call to action',
  },
  {
    kind: 'Beauty and grooming',
    examples: 'hairdresser, barber, nail studio, beautician, spa, tattoo studio',
    pages: 'Home, Services and prices, Gallery, Team, Contact',
    home: 'hero with a booking button > services with a price list > the stylists > gallery of work > before and after > reviews > brands and products used > appointment request > common questions > long text about the salon and the area > opening hours with map > final call to action',
  },
  {
    kind: 'Clinic or practice',
    examples: 'dentist, physiotherapist, vet, optician, doctor, psychologist',
    pages: 'Home, Treatments, Fees, Team, Contact',
    home: 'hero with booking and phone > emergency or notice strip > treatments > clinicians with qualifications > what happens at the first visit > the clinic and its equipment > fees and plans > insurers and accreditations > patient reviews > appointment request > common questions > long text about the practice > opening hours with map',
  },
  {
    kind: 'Garage and vehicle services',
    examples: 'car mechanic, car detailing, tyre shop, body shop, car wash',
    pages: 'Home, Services, Prices, About, Contact',
    home: 'hero with a booking button > services or packages > prices by vehicle size > before and after > the process with durations > makes serviced and approvals > guarantee > reviews > booking or callback request > areas covered for mobile services > common questions > long text about the service in the area > opening hours with map',
  },
  {
    kind: 'Tutor, coach or consultant',
    examples: 'language tutor, music teacher, personal trainer, business coach, freelancer',
    pages: 'Home, Lessons or Services, About, Prices, Contact',
    home: 'hero with a trial lesson or call > who I help > what you get > how it works > about me with qualifications > curriculum or levels > results and testimonials > rates > a free resource > booking > common questions > final call to action',
  },
  {
    kind: 'Restaurant, cafe or bakery',
    examples: 'restaurant, pizzeria, cafe, bar, bakery, food truck, catering',
    pages: 'Home, Menu, Our story, Gallery, Visit',
    home: 'hero with a strong photo and a booking button > the story > signature dishes > menu with prices > gallery > the chef or the team > reviews and press > private events > table reservation request > opening hours with map > newsletter',
  },
  {
    kind: 'Gym, studio or club',
    examples: 'gym, yoga studio, dance school, martial arts, sports club',
    pages: 'Home, Classes, Timetable, Memberships, Trainers, Contact',
    home: 'hero with a free trial > classes > timetable > memberships and prices > trainers > the facilities > results or before and after > reviews > numbers > common questions > location with map and opening hours',
  },
  {
    kind: 'Charity or community group',
    examples: 'local charity, animal rescue, food bank, association, church, foundation',
    pages: 'Home, What we do, Get involved, Events, About, Donate',
    home: 'hero with a donate button > the mission > impact in numbers > programmes > the story of one person or animal helped > donation amounts and what each pays for > other ways to give > where the money goes > upcoming events > volunteer call > supporters > news > newsletter > contact',
  },
  {
    kind: 'Mobile app',
    examples: 'app launch, app showcase, game',
    pages: 'Home, Features, Pricing, Download',
    home: 'hero with the phone and store badges > press logos > the key features one by one > screens > how it works > more features > numbers > user reviews > pricing > common questions > download call to action',
  },
  {
    kind: 'Software product',
    examples: 'SaaS, web tool, platform, API',
    pages: 'Home, Features, Pricing, About, Contact',
    home: 'hero with a product screenshot > customer logos > the problem and the outcome > features > how it works > integrations or numbers > testimonials or a case study > pricing > comparison > common questions > final call to action',
  },
  {
    kind: 'Personal brand',
    examples: 'creator, speaker, author, artist, influencer, expert',
    pages: 'Home, About, Work, Contact',
    home: 'hero with a portrait > as seen in > the story > audience numbers > what I do > latest content > offers > testimonials > newsletter > work with me',
  },
  {
    kind: 'Shop or brand showcase',
    examples: 'fashion store, jewellery, crafts, cosmetics, food products, furniture',
    pages: 'Home, Collection, Our story, Stockists, Contact',
    home: 'perks strip > hero > collections > product cards with prices > one featured product > lookbook > brand story and materials > press and reviews > size or care guide > where to buy > newsletter',
  },
  {
    kind: 'Ebook or book',
    examples: 'ebook landing page, book launch, guide, report',
    pages: 'one long page',
    home: 'hero with the cover and the price > what you will learn > chapter list > a sample > who it is for > about the author > reader quotes > formats and price > bonuses > guarantee > common questions > final call to action',
  },
  {
    kind: 'Online course or program',
    examples: 'course sales page, workshop, bootcamp, membership, webinar',
    pages: 'one long page',
    home: 'hero with a video and an enrol button > proof strip > the problem and the outcome > curriculum with modules and lessons > a preview lesson > the instructor > who it is for > everything included > student results > price with guarantee > deadline > common questions > final call to action',
  },
  {
    kind: 'Financial services',
    examples: 'financial adviser, accountant, insurance broker, lender, bank, credit union',
    pages: 'Home, Services, About, Fees, Insights, Contact',
    home: 'hero > regulators and memberships > services > who we help > the process > rates or fees table > advisers with credentials > client outcomes > insights > risk warning > book a consultation > common questions',
  },
  {
    kind: 'Law firm or professional practice',
    examples: 'law firm, notary, architect office, tax adviser, translator',
    pages: 'Home, Practice areas, People, Fees, Insights, Contact',
    home: 'hero > practice areas > who we act for > results > people with credentials > rankings and awards > the process > fees > insights > consultation > offices with map',
  },
  {
    kind: 'Real estate',
    examples: 'estate agent, property manager, developer, builder',
    pages: 'Home, Properties, Sell with us, About, Contact',
    home: 'hero > featured properties > track record in numbers > buy, sell or let > neighbourhoods > the selling process > about the agent > reviews > valuation request > office with map',
  },
  {
    kind: 'Event',
    examples: 'conference, festival, workshop day, wedding, meetup',
    pages: 'Home, Programme, Speakers, Tickets, Venue',
    home: 'hero with date, place and tickets > numbers > about the event > speakers > agenda > tickets > venue and travel > sponsors > gallery > common questions > tickets call to action',
  },
  {
    kind: 'Hotel or holiday rental',
    examples: 'hotel, bed and breakfast, guest house, apartment, campsite',
    pages: 'Home, Rooms, Gallery, Location, Contact',
    home: 'hero > rooms with prices > amenities > gallery > breakfast and dining > things to do nearby > getting here with map > offers > check-in rules > reviews > common questions > contact',
  },
  {
    kind: 'Portfolio or studio',
    examples: 'photographer, designer, architect, agency, video maker, illustrator',
    pages: 'Home, Work, Services, About, Contact',
    home: 'hero > selected work > services > the process > client logos > a testimonial > awards and press > about > enquiry',
  },
];

export function playbookText(): string {
  const lines: string[] = [];
  for (const { kind, examples, pages, home } of PLAYBOOKS) {
    lines.push(`- ${kind} (${examples}). Pages: ${pages}. Home page: ${home}.`);
  }
  return lines.join('\n');
}
