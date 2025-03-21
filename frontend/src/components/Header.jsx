import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Removed api import since we are using axios directly

async function fetchUserData() {
    try {
        const yourToken = localStorage.getItem('access_token');
        const response = await axios.get('/api/me', {
            headers: {
                Authorization: `Bearer ${yourToken}`
            }
        });
        console.log(response.data);  // Confirm data structure
        return response.data;       // Ensure this returns the actual data
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}




  export default function Header() {
    const [username, setUsername] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getUserData = async () => {
            const userData = await fetchUserData();
            console.log('User Data:', userData); // Debugging log
            setUsername(userData ? userData.given_name : null);
        };

        getUserData();
    }, []);


    return (
      <div className="flex items-center justify-between p-4">
        <div className="text-lg text-blue-700">
          {username
            ? `Привет, ${username}!`
            : 'Войдите чтобы пользоваться всем функционалом!'}
        </div>

        <button
          onClick={() => window.location.assign('http://localhost/login/')}
          className="text-blue-700 border border-blue-700 rounded px-3 py-1 hover:bg-blue-700 hover:text-white transition"
        >
          Войти
        </button>
      </div>
    );
  }



