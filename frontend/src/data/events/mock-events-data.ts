// Helper function to get random rating
const getRandomRating = () => {
    return (Math.floor(Math.random() * 30) + 65) / 10
  }

  // Helper function to get random number in range
  const getRandomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Helper function to get random item from array
  const getRandomItem = <T,>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)]
  }

  // Club types
  export const clubTypes = [
    "academic",
    "professional",
    "recreational",
    "cultural",
    "sports",
    "social",
    "art",
    "technology",
  ] as const

  // Event policies
  export const eventPolicies = ["open", "free_ticket", "paid_ticket"] as const

  // Places
  const places = [
    "Main Hall",
    "Room 305",
    "Atrium",
    "Student Lounge",
    "Conference Hall",
    "Computer Lab",
    "Library",
    "Sports Center",
    "Auditorium",
    "Cafeteria",
  ]

  // Event images
  export const eventImages = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560523159-4a9692d222f9?q=80&w=2036&auto=format&fit=crop",
  ]

  // Club images
  export const clubImages = [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2068&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop",
  ]

  // Generate mock clubs
  export const mockClubs: NuEvents.Club[] = [
    {
      id: 1,
      name: "Debate Club",
      type: "academic",
      description:
        "The Debate Club is a platform for students to develop critical thinking and public speaking skills through structured debates on various topics. Members participate in regular debates, workshops, and competitions.",
      president: "Alikhan Turebekov",
      telegram_url: "https://t.me/nudebateclub",
      instagram_url: "https://instagram.com/nudebateclub",
      created_at: "2023-01-15T10:00:00Z",
      updated_at: "2023-01-15T10:00:00Z",
      media: [{ id: 101, url: clubImages[0] }],
      members: 120,
      followers: 245,
      isFollowing: false,
    },
    {
      id: 2,
      name: "Tech Club",
      type: "technology",
      description:
        "The Tech Club brings together students interested in technology, programming, and innovation. We organize hackathons, workshops, and tech talks to help members develop technical skills and network with industry professionals.",
      president: "Dinara Smagulova",
      telegram_url: "https://t.me/nutechclub",
      instagram_url: "https://instagram.com/nutechclub",
      created_at: "2023-02-10T14:30:00Z",
      updated_at: "2023-02-10T14:30:00Z",
      media: [{ id: 102, url: clubImages[1] }],
      members: 150,
      followers: 320,
      isFollowing: true,
    },
    {
      id: 3,
      name: "Film Society",
      type: "recreational",
      description:
        "The Film Society is dedicated to the appreciation and study of cinema. We organize film screenings, discussions, and workshops on filmmaking. Join us to explore the world of cinema and develop your filmmaking skills.",
      president: "Marat Zhunusov",
      telegram_url: "https://t.me/nufilmsociety",
      instagram_url: "https://instagram.com/nufilmsociety",
      created_at: "2023-03-05T16:45:00Z",
      updated_at: "2023-03-05T16:45:00Z",
      media: [{ id: 103, url: clubImages[2] }],
      members: 85,
      followers: 190,
      isFollowing: false,
    },
    {
      id: 4,
      name: "Cultural Association",
      type: "cultural",
      description:
        "The Cultural Association celebrates the diverse cultural heritage of our student body. We organize cultural events, festivals, and workshops to promote cultural exchange and understanding among students.",
      president: "Aigerim Nurbekova",
      telegram_url: "https://t.me/nuculturalassociation",
      instagram_url: "https://instagram.com/nuculturalassociation",
      created_at: "2023-04-20T11:15:00Z",
      updated_at: "2023-04-20T11:15:00Z",
      media: [{ id: 104, url: clubImages[3] }],
      members: 110,
      followers: 230,
      isFollowing: false,
    },
    {
      id: 5,
      name: "Basketball Team",
      type: "sports",
      description:
        "The Basketball Team represents the university in various competitions. We practice regularly to improve our skills and teamwork. Join us if you're passionate about basketball and want to compete at a high level.",
      president: "Ruslan Karimov",
      telegram_url: "https://t.me/nubasketball",
      instagram_url: "https://instagram.com/nubasketball",
      created_at: "2023-05-12T09:30:00Z",
      updated_at: "2023-05-12T09:30:00Z",
      media: [{ id: 105, url: clubImages[4] }],
      members: 25,
      followers: 175,
      isFollowing: true,
    },
    {
      id: 6,
      name: "Student Council",
      type: "social",
      description:
        "The Student Council is the official representative body of the student community. We work to address student concerns, organize social events, and improve campus life for all students.",
      president: "Zhanar Tulegenova",
      telegram_url: "https://t.me/nustudentcouncil",
      instagram_url: "https://instagram.com/nustudentcouncil",
      created_at: "2023-06-08T13:45:00Z",
      updated_at: "2023-06-08T13:45:00Z",
      media: [{ id: 106, url: clubImages[5] }],
      members: 30,
      followers: 450,
      isFollowing: false,
    },
    {
      id: 7,
      name: "Art Workshop",
      type: "art",
      description:
        "The Art Workshop is a creative space for students interested in visual arts. We organize art exhibitions, workshops, and collaborative projects to help members develop their artistic skills and express their creativity.",
      president: "Kamila Sergazina",
      telegram_url: "https://t.me/nuartworkshop",
      instagram_url: "https://instagram.com/nuartworkshop",
      created_at: "2023-07-15T15:00:00Z",
      updated_at: "2023-07-15T15:00:00Z",
      media: [{ id: 107, url: clubImages[0] }],
      members: 65,
      followers: 140,
      isFollowing: false,
    },
    {
      id: 8,
      name: "Entrepreneurship Club",
      type: "professional",
      description:
        "The Entrepreneurship Club supports students interested in business and entrepreneurship. We organize workshops, mentorship programs, and networking events to help members develop their business ideas and entrepreneurial skills.",
      president: "Arman Nurpeisov",
      telegram_url: "https://t.me/nuentrepreneurship",
      instagram_url: "https://instagram.com/nuentrepreneurship",
      created_at: "2023-08-20T10:30:00Z",
      updated_at: "2023-08-20T10:30:00Z",
      media: [{ id: 108, url: clubImages[1] }],
      members: 95,
      followers: 210,
      isFollowing: true,
    },
    {
      id: 9,
      name: "Music Band",
      type: "recreational",
      description:
        "The Music Band brings together students passionate about music. We practice regularly and perform at various university events. Join us if you play an instrument or sing and want to share your talent with the community.",
      president: "Timur Aliyev",
      telegram_url: "https://t.me/numusicband",
      instagram_url: "https://instagram.com/numusicband",
      created_at: "2023-09-05T14:15:00Z",
      updated_at: "2023-09-05T14:15:00Z",
      media: [{ id: 109, url: clubImages[2] }],
      members: 40,
      followers: 165,
      isFollowing: false,
    },
    {
      id: 10,
      name: "International Students Association",
      type: "cultural",
      description:
        "The International Students Association supports international students and promotes cultural exchange. We organize cultural events, orientation programs, and social activities to help international students adapt to campus life.",
      president: "Sofia Kim",
      telegram_url: "https://t.me/nuinternational",
      instagram_url: "https://instagram.com/nuinternational",
      created_at: "2023-10-10T11:45:00Z",
      updated_at: "2023-10-10T11:45:00Z",
      media: [{ id: 110, url: clubImages[3] }],
      members: 75,
      followers: 180,
      isFollowing: false,
    },
  ]

  // Generate mock events
  const today = new Date()

  // Helper function to add hours to a date
  const addHours = (date: Date, hours: number) => {
    const newDate = new Date(date)
    newDate.setHours(newDate.getHours() + hours)
    return newDate
  }

  // Helper function to add days to a date
  const addDays = (date: Date, days: number) => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
  }

  // Helper function to subtract days from a date
  const subDays = (date: Date, days: number) => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() - days)
    return newDate
  }

  // Helper function to format date
  const format = (date: Date, formatStr: string) => {
    // Simple format function for the mock data
    return date.toISOString()
  }

  export const mockEvents: NuEvents.Event[] = [
    {
      id: 1,
      club_id: 1,
      name: "Freshman Orientation Debate",
      place: "Main Hall",
      description:
        "Join us for an exciting debate session designed specifically for freshmen. Learn the basics of debate, meet experienced debaters, and participate in a friendly debate competition. This is a great opportunity to develop your critical thinking and public speaking skills.",
      duration: 120,
      event_datetime: format(addHours(today, 3), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-07-20T10:00:00Z",
      updated_at: "2023-07-20T10:00:00Z",
      media: [{ id: 201, url: eventImages[0] }],
      club: mockClubs[0],
      rating: getRandomRating(),
    },
    {
      id: 2,
      club_id: 2,
      name: "Hackathon: Build for NU",
      place: "Computer Lab",
      description:
        "A 24-hour hackathon where students will work in teams to develop innovative solutions for campus problems. Prizes will be awarded to the top three teams. Food and drinks will be provided. Bring your laptop and your creativity!",
      duration: 1440,
      event_datetime: format(addDays(today, 2), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-07-25T14:30:00Z",
      updated_at: "2023-07-25T14:30:00Z",
      media: [{ id: 202, url: eventImages[1] }],
      club: mockClubs[1],
      rating: getRandomRating(),
    },
    {
      id: 3,
      club_id: 3,
      name: "Movie Night: Classic Cinema",
      place: "Student Lounge",
      description:
        "Join us for a screening of classic cinema masterpieces. We'll be showing a selection of films from the golden age of cinema, followed by a discussion about their historical and cultural significance. Popcorn and refreshments will be provided.",
      duration: 180,
      event_datetime: format(addHours(today, 6), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-08-01T16:45:00Z",
      updated_at: "2023-08-01T16:45:00Z",
      media: [{ id: 203, url: eventImages[2] }],
      club: mockClubs[2],
      rating: getRandomRating(),
    },
    {
      id: 4,
      club_id: 4,
      name: "Cultural Festival",
      place: "Atrium",
      description:
        "Experience the rich cultural diversity of our university at the annual Cultural Festival. Enjoy performances, food stalls, art exhibitions, and interactive activities representing various cultures from around the world. This is a great opportunity to learn about different cultures and make new friends.",
      duration: 360,
      event_datetime: format(addDays(today, 5), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-08-05T11:15:00Z",
      updated_at: "2023-08-05T11:15:00Z",
      media: [{ id: 204, url: eventImages[3] }],
      club: mockClubs[3],
      rating: getRandomRating(),
    },
    {
      id: 5,
      club_id: 5,
      name: "Basketball Tournament",
      place: "Sports Center",
      description:
        "Participate in or cheer for your favorite team in the annual Basketball Tournament. Teams from different departments will compete for the championship title. There will be prizes for the winning team and the most valuable player.",
      duration: 240,
      event_datetime: format(addDays(today, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-08-10T09:30:00Z",
      updated_at: "2023-08-10T09:30:00Z",
      media: [{ id: 205, url: eventImages[4] }],
      club: mockClubs[4],
      rating: getRandomRating(),
    },
    {
      id: 6,
      club_id: 6,
      name: "Student Council Elections",
      place: "Conference Hall",
      description:
        "Cast your vote in the Student Council Elections. Meet the candidates, hear their platforms, and participate in the Q&A session. Your vote matters in shaping the future of our university community.",
      duration: 480,
      event_datetime: format(addDays(today, 7), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-08-15T13:45:00Z",
      updated_at: "2023-08-15T13:45:00Z",
      media: [{ id: 206, url: eventImages[5] }],
      club: mockClubs[5],
      rating: getRandomRating(),
    },
    {
      id: 7,
      club_id: 7,
      name: "Art Exhibition: Student Works",
      place: "Library",
      description:
        "Visit the Art Exhibition featuring works by talented student artists. The exhibition will showcase paintings, sculptures, photographs, and digital art created by students from various departments. Meet the artists and learn about their creative process.",
      duration: 300,
      event_datetime: format(addHours(today, 4), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-08-20T15:00:00Z",
      updated_at: "2023-08-20T15:00:00Z",
      media: [{ id: 207, url: eventImages[6] }],
      club: mockClubs[6],
      rating: getRandomRating(),
    },
    {
      id: 8,
      club_id: 8,
      name: "Startup Pitch Competition",
      place: "Auditorium",
      description:
        "Watch or participate in the Startup Pitch Competition. Student entrepreneurs will pitch their business ideas to a panel of judges from the industry. The winning team will receive funding and mentorship to develop their startup.",
      duration: 240,
      event_datetime: format(addDays(today, 3), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "paid_ticket",
      created_at: "2023-08-25T10:30:00Z",
      updated_at: "2023-08-25T10:30:00Z",
      media: [{ id: 208, url: eventImages[7] }],
      club: mockClubs[7],
      rating: getRandomRating(),
    },
    {
      id: 9,
      club_id: 9,
      name: "Live Music Performance",
      place: "Cafeteria",
      description:
        "Enjoy a live music performance by the university's Music Band. The band will perform a mix of popular songs and original compositions. Come support your fellow students and enjoy an evening of great music.",
      duration: 120,
      event_datetime: format(addDays(today, 4), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-09-01T14:15:00Z",
      updated_at: "2023-09-01T14:15:00Z",
      media: [{ id: 209, url: eventImages[0] }],
      club: mockClubs[8],
      rating: getRandomRating(),
    },
    {
      id: 10,
      club_id: 10,
      name: "International Food Fair",
      place: "Atrium",
      description:
        "Sample cuisines from around the world at the International Food Fair. International students will prepare and serve traditional dishes from their home countries. This is a great opportunity to experience different cultures through food.",
      duration: 240,
      event_datetime: format(addDays(today, 6), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-09-05T11:45:00Z",
      updated_at: "2023-09-05T11:45:00Z",
      media: [{ id: 210, url: eventImages[1] }],
      club: mockClubs[9],
      rating: getRandomRating(),
    },
    {
      id: 11,
      club_id: 1,
      name: "Public Speaking Workshop",
      place: "Room 305",
      description:
        "Improve your public speaking skills at this interactive workshop. Learn techniques to overcome stage fright, structure your speeches effectively, and engage your audience. This workshop is suitable for beginners and experienced speakers alike.",
      duration: 120,
      event_datetime: format(addDays(today, 8), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-09-10T10:00:00Z",
      updated_at: "2023-09-10T10:00:00Z",
      media: [{ id: 211, url: eventImages[2] }],
      club: mockClubs[0],
      rating: getRandomRating(),
    },
    {
      id: 12,
      club_id: 2,
      name: "AI Workshop: Machine Learning Basics",
      place: "Computer Lab",
      description:
        "Learn the basics of machine learning in this hands-on workshop. We'll cover fundamental concepts, algorithms, and applications of machine learning. Participants will work on a simple project to apply what they've learned.",
      duration: 180,
      event_datetime: format(subDays(today, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "paid_ticket",
      created_at: "2023-09-15T14:30:00Z",
      updated_at: "2023-09-15T14:30:00Z",
      media: [{ id: 212, url: eventImages[3] }],
      club: mockClubs[1],
      rating: getRandomRating(),
    },
    {
      id: 13,
      club_id: 3,
      name: "Film Analysis: Modern Classics",
      place: "Student Lounge",
      description:
        "Join us for an in-depth analysis of modern classic films. We'll watch and discuss films that have defined contemporary cinema, examining their themes, techniques, and cultural impact. This is a great opportunity for film enthusiasts to deepen their understanding of cinema.",
      duration: 180,
      event_datetime: format(subDays(today, 2), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-09-20T16:45:00Z",
      updated_at: "2023-09-20T16:45:00Z",
      media: [{ id: 213, url: eventImages[4] }],
      club: mockClubs[2],
      rating: getRandomRating(),
    },
    {
      id: 14,
      club_id: 4,
      name: "Traditional Dance Workshop",
      place: "Main Hall",
      description:
        "Learn traditional dances from different cultures in this interactive workshop. Experienced dancers will teach basic steps and movements from various cultural traditions. No prior dance experience is required.",
      duration: 120,
      event_datetime: format(addDays(today, 9), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-09-25T11:15:00Z",
      updated_at: "2023-09-25T11:15:00Z",
      media: [{ id: 214, url: eventImages[5] }],
      club: mockClubs[3],
      rating: getRandomRating(),
    },
    {
      id: 15,
      club_id: 5,
      name: "Fitness Challenge",
      place: "Sports Center",
      description:
        "Test your fitness level in this fun and challenging event. Participants will complete a series of exercises and challenges designed to test strength, endurance, and agility. Prizes will be awarded to the top performers.",
      duration: 180,
      event_datetime: format(addHours(today, 2), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-09-30T09:30:00Z",
      updated_at: "2023-09-30T09:30:00Z",
      media: [{ id: 215, url: eventImages[6] }],
      club: mockClubs[4],
      rating: getRandomRating(),
    },
    {
      id: 16,
      club_id: 6,
      name: "Town Hall Meeting",
      place: "Conference Hall",
      description:
        "Attend the Town Hall Meeting to discuss important issues affecting the student community. This is your opportunity to voice your concerns, ask questions, and provide feedback to the Student Council and university administration.",
      duration: 120,
      event_datetime: format(addDays(today, 10), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-10-05T13:45:00Z",
      updated_at: "2023-10-05T13:45:00Z",
      media: [{ id: 216, url: eventImages[7] }],
      club: mockClubs[5],
      rating: getRandomRating(),
    },
    {
      id: 17,
      club_id: 7,
      name: "Photography Workshop",
      place: "Library",
      description:
        "Learn the basics of photography in this hands-on workshop. We'll cover camera settings, composition, lighting, and editing. Bring your camera (DSLR, mirrorless, or smartphone) and capture beautiful images around campus.",
      duration: 180,
      event_datetime: format(addDays(today, 11), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "paid_ticket",
      created_at: "2023-10-10T15:00:00Z",
      updated_at: "2023-10-10T15:00:00Z",
      media: [{ id: 217, url: eventImages[0] }],
      club: mockClubs[6],
      rating: getRandomRating(),
    },
    {
      id: 18,
      club_id: 8,
      name: "Networking Mixer",
      place: "Auditorium",
      description:
        "Connect with industry professionals, alumni, and fellow students at the Networking Mixer. This is a great opportunity to build your professional network, learn about career opportunities, and get advice from experienced professionals.",
      duration: 120,
      event_datetime: format(addDays(today, 12), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-10-15T10:30:00Z",
      updated_at: "2023-10-15T10:30:00Z",
      media: [{ id: 218, url: eventImages[1] }],
      club: mockClubs[7],
      rating: getRandomRating(),
    },
    {
      id: 19,
      club_id: 9,
      name: "Open Mic Night",
      place: "Cafeteria",
      description:
        "Showcase your talent at the Open Mic Night. Sing, play an instrument, recite poetry, perform comedy, or share any other talent you have. Sign up in advance or on the spot. Come support your fellow students and enjoy an evening of diverse performances.",
      duration: 180,
      event_datetime: format(addDays(today, 13), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-10-20T14:15:00Z",
      updated_at: "2023-10-20T14:15:00Z",
      media: [{ id: 219, url: eventImages[2] }],
      club: mockClubs[8],
      rating: getRandomRating(),
    },
    {
      id: 20,
      club_id: 10,
      name: "Language Exchange",
      place: "Student Lounge",
      description:
        "Practice speaking different languages at the Language Exchange event. Connect with native speakers and fellow language learners in a casual and supportive environment. All language levels are welcome.",
      duration: 120,
      event_datetime: format(addDays(today, 14), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-10-25T11:45:00Z",
      updated_at: "2023-10-25T11:45:00Z",
      media: [{ id: 220, url: eventImages[3] }],
      club: mockClubs[9],
      rating: getRandomRating(),
    },
  ]

  // Generate more events for today
  export const todayEvents = [
    ...mockEvents.filter((event) => {
      const eventDate = new Date(event.event_datetime)
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      )
    }),
    {
      id: 101,
      club_id: 1,
      name: "Debate Competition Finals",
      place: "Main Hall",
      description:
        "The final round of our semester-long debate competition. Come watch the top teams compete for the championship title.",
      duration: 180,
      event_datetime: format(addHours(today, 5), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-10-01T10:00:00Z",
      updated_at: "2023-10-01T10:00:00Z",
      media: [{ id: 301, url: eventImages[4] }],
      club: mockClubs[0],
      rating: getRandomRating(),
    },
    {
      id: 102,
      club_id: 3,
      name: "Documentary Screening",
      place: "Student Lounge",
      description: "Screening of an award-winning documentary followed by a discussion with a special guest speaker.",
      duration: 150,
      event_datetime: format(addHours(today, 7), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "free_ticket",
      created_at: "2023-10-02T16:45:00Z",
      updated_at: "2023-10-02T16:45:00Z",
      media: [{ id: 302, url: eventImages[5] }],
      club: mockClubs[2],
      rating: getRandomRating(),
    },
    {
      id: 103,
      club_id: 5,
      name: "Morning Yoga Session",
      place: "Sports Center",
      description:
        "Start your day with a refreshing yoga session. Suitable for all levels, from beginners to advanced practitioners.",
      duration: 60,
      event_datetime: format(addHours(today, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      policy: "open",
      created_at: "2023-10-03T09:30:00Z",
      updated_at: "2023-10-03T09:30:00Z",
      media: [{ id: 303, url: eventImages[6] }],
      club: mockClubs[4],
      rating: getRandomRating(),
    },
  ]

  // Categorize events
  export const academicEvents = mockEvents.filter(
    (event) =>
      event.club?.type === "academic" || event.club?.type === "professional" || event.club?.type === "technology",
  )
  export const culturalEvents = mockEvents.filter(
    (event) => event.club?.type === "cultural" || event.club?.type === "art",
  )
  export const sportsEvents = mockEvents.filter((event) => event.club?.type === "sports")
  export const socialEvents = mockEvents.filter(
    (event) => event.club?.type === "social" || event.club?.type === "recreational",
  )
  export const featuredEvents = mockEvents.filter((event) => (event.rating || 0) > 7.5)

  // Mock API functions
  export const mockApi = {
    getEvents: (page = 1, size = 20, clubType: NuEvents.ClubType | null, policy?: NuEvents.EventPolicy | null) => {
      let filteredEvents = [...mockEvents]

      if (clubType) {
        filteredEvents = filteredEvents.filter((event) => event.club?.type === clubType)
      }

      if (policy) {
        filteredEvents = filteredEvents.filter((event) => event.policy === policy)
      }

      const totalEvents = filteredEvents.length
      const totalPages = Math.ceil(totalEvents / size)
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size

      return {
        events: filteredEvents.slice(startIndex, endIndex),
        num_of_pages: totalPages,
      }
    },

    getClubs: (page = 1, size = 20, clubType?: NuEvents.ClubType) => {
      let filteredClubs = [...mockClubs]

      if (clubType) {
        filteredClubs = filteredClubs.filter((club) => club.type === clubType)
      }

      const totalClubs = filteredClubs.length
      const totalPages = Math.ceil(totalClubs / size)
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size

      return {
        clubs: filteredClubs.slice(startIndex, endIndex),
        num_of_pages: totalPages,
      }
    },

    getEvent: (id: number) => {
      return mockEvents.find((event) => event.id === id) || null
    },

    getClub: (id: number) => {
      return mockClubs.find((club) => club.id === id) || null
    },

    getClubEvents: (clubId: number, page = 1, size = 20) => {
      const filteredEvents = mockEvents.filter((event) => event.club_id === clubId)
      const totalEvents = filteredEvents.length
      const totalPages = Math.ceil(totalEvents / size)
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size

      return {
        events: filteredEvents.slice(startIndex, endIndex),
        num_of_pages: totalPages,
      }
    },

    searchEvents: (keyword: string, page = 1, size = 20) => {
      const query = keyword.toLowerCase()
      const filteredEvents = mockEvents.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.place.toLowerCase().includes(query) ||
          event.club?.name.toLowerCase().includes(query),
      )

      const totalEvents = filteredEvents.length
      const totalPages = Math.ceil(totalEvents / size)
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size

      return {
        events: filteredEvents.slice(startIndex, endIndex),
        num_of_pages: totalPages,
      }
    },

    getPreSearchSuggestions: (keyword: string) => {
      const query = keyword.toLowerCase()
      return mockEvents
        .filter((event) => event.name.toLowerCase().includes(query))
        .map((event) => event.name)
        .slice(0, 5)
    },

    toggleFollowClub: (clubId: number) => {
      const club = mockClubs.find((c) => c.id === clubId)
      if (club) {
        club.isFollowing = !club.isFollowing
        if (club.isFollowing) {
          club.followers += 1
        } else {
          club.followers -= 1
        }
        return club
      }
      return null
    },
  }
