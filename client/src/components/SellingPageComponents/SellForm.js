import { useState } from "react";
import Navbar from "../HomeComponents/Navbar";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

const SellForm = ({ refresh }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ year: '', make: '', model: '', description: '', price: '', location: '', images: null, mileage: '' });
  const handleChange = (e) => { const { name, value, files } = e.target; setForm(f => ({ ...f, [name]: files ? files : value })); };
  
  const handleSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('year', form.year);
      formData.append('make', form.make);
      formData.append('model', form.model);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('location', form.location);
      formData.append('mileage', form.mileage);
      if (form.images && form.images[0]) { formData.append('item_photo', form.images[0]); }
      try {
          const response = await axios.post('http://localhost:5000/listings', formData);
          alert(response.data.message);
          setForm({ year: '', make: '', model: '', description: '', price: '', location: '', images: null, mileage: '' });
          refresh();
          navigate('/');
      } catch (err) { alert("Error"); }
  };

  const containerStyle = { border: '1px solid #dcedff', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #8f91a2', marginTop: '0.5rem', fontFamily: 'Montserrat' };
  const labelStyle = { fontWeight: '600', color: '#343f3e' };

  return (
    <>
      <Navbar />
      <div style={{ margin: '3rem auto', width: '90%', maxWidth: '800px' }}>
        <h2 style={{ marginBottom: '2rem', color: '#343f3e', textAlign: 'center' }}>Create New Listing</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={containerStyle}>
            <label style={labelStyle}>Car Details</label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <input className="input-focus" style={inputStyle} type="text" name="year" value={form.year} required placeholder="Year" onChange={handleChange} />
                <input className="input-focus" style={inputStyle} type="text" name="make" value={form.make} required placeholder="Make" onChange={handleChange} />
                <input className="input-focus" style={inputStyle} type="text" name="model" value={form.model} required placeholder="Model" onChange={handleChange} />
                <input className="input-focus" style={inputStyle} type="text" name="mileage" value={form.mileage} required placeholder="Mileage" onChange={handleChange} />
            </div>
          </div>

          <div style={containerStyle}>
             <label style={labelStyle}>Description</label>
              <textarea className="input-focus" style={{...inputStyle, minHeight: '8rem', resize: 'vertical'}} name="description" value={form.description} required onChange={handleChange} />
          </div>

          <div style={{display: 'flex', gap: '1.5rem'}}>
            <div style={{...containerStyle, flex: 1}}>
                <label style={labelStyle}>Price ($)</label>
                <input className="input-focus" style={inputStyle} type="number" name="price" value={form.price} required onChange={handleChange} />
            </div>
            <div style={{...containerStyle, flex: 1}}>
                <label style={labelStyle}>Location</label>
                <input className="input-focus" style={inputStyle} type="text" name="location" value={form.location} required onChange={handleChange} />
            </div>
          </div>

          <div style={containerStyle}>
            <label style={labelStyle}>Upload Photo</label>
              <input style={{...inputStyle, border: 'none', padding: '10px 0'}} type="file" name="images" onChange={handleChange} />
          </div>
          
          <button className="btn-primary" type="submit" style={{ padding: '15px', borderRadius: '8px', backgroundColor: '#343f3e', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(52, 63, 62, 0.2)' }}>Publish Listing</button>
        </form>
      </div>
    </>
  )
}

export default SellForm;