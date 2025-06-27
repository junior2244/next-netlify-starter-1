import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://nlzkclwptvjhodopovyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5semtjbHdwdHZqaG9kb3Bvdnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjkyNDgsImV4cCI6MjA2NjYwNTI0OH0.rBspRNcntUsjoHkcNLdujJPjJArcrF2h5D-wjZQxTbE'
);

const App = () => {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newMember, setNewMember] = useState({ discord_id: '', name: '' });
  const [promotion, setPromotion] = useState({ member_id: '', category_id: '', rank_id: '' });
  const [message, setMessage] = useState('');

  // Fetch user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Fetch data
  useEffect(() => {
    if (user) {
      fetchMembers();
      fetchCategories();
      fetchRanks();
    }
  }, [user]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        member_ranks (
          rank_id,
          ranks (
            name,
            category_id,
            categories (name)
          )
        )
      `);
    if (error) {
      setMessage('Error fetching members: ' + error.message);
    } else {
      setMembers(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      setMessage('Error fetching categories: ' + error.message);
    } else {
      setCategories(data);
    }
  };

  const fetchRanks = async () => {
    const { data, error } = await supabase.from('ranks').select(`
      *,
      categories (name)
    `);
    if (error) {
      setMessage('Error fetching ranks: ' + error.message);
    } else {
      setRanks(data);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage('Login error: ' + error.message);
    } else {
      setMessage('Logged in successfully!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('Logged out successfully!');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('members').insert([newMember]);
    if (error) {
      setMessage('Error adding member: ' + error.message);
    } else {
      setMessage('Member added successfully!');
      setNewMember({ discord_id: '', name: '' });
      fetchMembers();
    }
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    const { member_id, category_id, rank_id } = promotion;

    // Fetch current ranks for the member in the selected category
    const { data: currentRanks, error: fetchError } = await supabase
      .from('member_ranks')
      .select('id, rank_id, ranks (category_id)')
      .eq('member_id', member_id)
      .eq('ranks.category_id', category_id);

    if (fetchError) {
      setMessage('Error fetching current ranks: ' + fetchError.message);
      return;
    }

    // Remove existing ranks in the same category
    if (currentRanks.length > 0) {
      const { error: deleteError } = await supabase
        .from('member_ranks')
        .delete()
        .eq('member_id', member_id)
        .eq('rank_id', currentRanks[0].rank_id);
      if (deleteError) {
        setMessage('Error removing old rank: ' + deleteError.message);
        return;
      }
    }

    // Assign new rank
    const { error: insertError } = await supabase
      .from('member_ranks')
      .insert([{ member_id, rank_id, assigned_at: new Date().toISOString() }]);
    if (insertError) {
      setMessage('Error assigning new rank: ' + insertError.message);
    } else {
      setMessage('Promotion successful!');
      setPromotion({ member_id: '', category_id: '', rank_id: '' });
      fetchMembers();
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Login
          </button>
        </form>
        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Discord Roster & Promotion System</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Add Member Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add New Member</h2>
        <form onSubmit={handleAddMember} className="space-y-4">
          <input
            type="text"
            value={newMember.discord_id}
            onChange={(e) => setNewMember({ ...newMember, discord_id: e.target.value })}
            placeholder="Discord ID"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            value={newMember.name}
            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            placeholder="Name"
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">
            Add Member
          </button>
        </form>
      </div>

      {/* Promotion Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Promote Member</h2>
        <form onSubmit={handlePromote} className="space-y-4">
          <select
            value={promotion.member_id}
            onChange={(e) => setPromotion({ ...promotion, member_id: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.discord_id})
              </option>
            ))}
          </select>
          <select
            value={promotion.category_id}
            onChange={(e) => setPromotion({ ...promotion, category_id: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={promotion.rank_id}
            onChange={(e) => setPromotion({ ...promotion, rank_id: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Rank</option>
            {ranks
              .filter((rank) => rank.category_id === promotion.category_id)
              .map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.name} (Level: {rank.level})
                </option>
              ))}
          </select>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Promote
          </button>
        </form>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Roster</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Discord ID</th>
              <th className="p-2 border">Ranks</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="p-2 border">{member.name}</td>
                <td className="p-2 border">{member.discord_id}</td>
                <td className="p-2 border">
                  {member.member_ranks.map((mr) => (
                    <div key={mr.rank_id}>
                      {mr.ranks.name} ({mr.ranks.categories.name})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="mt-4 text-red-500">{message}</p>}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
