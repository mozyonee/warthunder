'use client';

import { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { getReasonPhrase } from 'http-status-codes';

const Home = () => {
	const [vehicles, setVehicles] = useState([]);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
		linkElements.forEach(link => {
		  	fetch(link.href)
				.then(response => response.text())
				.then(cssText => {
					const style = document.createElement('style');
					style.textContent = cssText;
					document.head.appendChild(style);
				});
		});
	}, []);
	
	const removeDuplicates = (array) => {
		const uniqueMap = new Map();
		
		array.forEach(vehicle => {
			uniqueMap.set(vehicle.VehicleID, vehicle);
		});
		
		return Array.from(uniqueMap.values());
	};
	
	const fetchUser = async (userToSearchFor) => {
		const response = await axios.get('https://thunderinsights.dk/api/v1/players/search', {
			params: { userToSearchFor, limit: '1' },
		});

		if(!Object.keys(response.data).length) return setErrorMessage('No player with this name was found.');

		const data = response.data[0];

		await axios.get(`https://thunderinsights.dk/api/v1/players/update/${data.UserID}`);
		
		return data;
	};
	
	const fetchVehicleStats = async (userID) => {
		const response = await axios.get(`https://thunderinsights.dk/api/v1/players/vehicleStats/${userID}`);
	
		if (!Object.keys(response.data).length) return setErrorMessage('Player data update requested, try again later.');
	
		const uniqueData = removeDuplicates(response.data);
	
		uniqueData.sort((a, b) => {
			return b.Tier - a.Tier || b.Battlerating - a.Battlerating;
		});
	
		return uniqueData;
	};
	
	const handleSubmit = async (data) => {
		setErrorMessage('');
		setVehicles('');

		try {
			const user = await fetchUser(data.name);
			if(user) {
				const vehicleStats = await fetchVehicleStats(user.UserID);
				setVehicles(vehicleStats);
			}
		} catch(error) {
			try {
				setErrorMessage(`${error.message} (${getReasonPhrase(error.response.status)}).`);
			} catch(err) {
				console.log(`An error occurred while processing your request:\n${err}`);
				setErrorMessage('An error occurred while processing your request.');
			}
		}
	};

	const handleScreenshot = () => {
		const body = document.getElementById('vehicles');
	  
		const images = body.querySelectorAll('img');
		const imagePromises = Array.from(images).map(img =>
			new Promise(resolve => {
				if (img.complete) resolve();
				else img.onload = resolve;
			})
		);
	  
		Promise.all(imagePromises)
			.then(() => {
				html2canvas(body, { logging: true, allowTaint: true, useCORS: true, scale: 1.5 })
					.then(canvas => {
						const imgData = canvas.toDataURL('image/png');
				
						const link = document.createElement('a');
						link.href = imgData;
						link.download = 'screenshot.png';
						link.click();
					});
			});
	};

	const handleCopy = () => {
		const firstFiveVehicles = vehicles.slice(0, 5);
		const vehicleNames = firstFiveVehicles.map(vehicle => vehicle.VehicleName.replace(/[^\w\s()"()-]/g, '')).join(' | ');
		navigator.clipboard.writeText(vehicleNames);
	};
		
	return (
		<main className='p-12' >
			<section className='flex justify-between flex-col md:flex-row gap-5'>
				<Formik initialValues={{ name: '' }} onSubmit={handleSubmit}
					validationSchema={Yup.object().shape({ name: Yup.string().required('This field is required') })} >
					{({ handleChange }) => (
						<Form>
							<ErrorMessage name='name' component='p' className='mb-3 text-center md:text-left text-red-600' />
							{errorMessage && <p className='mb-3 text-center md:text-left text-red-600'>{errorMessage}</p>}
							<div className='flex gap-5 flex-col md:flex-row'>
								<Field placeholder='Name' name='name' onChange={(e) => { handleChange(e); setErrorMessage(''); }}
									className='p-2 text-white bg-gray-900 rounded-md outline-none border-2 border-gray-700 text-center md:text-left' />
								<button className='md:px-12 py-2 text-white bg-blue-500 rounded-md cursor-pointer' type='submit' >Search</button>
							</div>
						</Form>
					)}
				</Formik>
				{vehicles && vehicles.length !== 0 && (
					<div className='flex gap-5'>
						<button className='md:px-12 py-2 text-white bg-blue-500 rounded-md cursor-pointer' onClick={handleCopy} >Copy</button>
						<button className='md:px-12 py-2 text-white bg-blue-500 rounded-md cursor-pointer' onClick={handleScreenshot} >Screenshot</button>
					</div>
				)}
			</section>

			<hr className='my-12 border-gray-700' />

			<section className='p-4 bg-gray-950' id='vehicles'>
				<ul className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
					{vehicles && vehicles.map((vehicle, index) => (
						<li key={index} className={`flex align-center justify-center md:justify-between flex-col md:flex-row text-white p-2 border-2 ${vehicle.Premium ? 'bg-yellow-400 border-yellow-400' : vehicle.Gift || vehicle.Event ? 'bg-amber-900 border-amber-800' : vehicle.Clan ? 'bg-green-900 border-green-800' : 'bg-cyan-900 border-cyan-800'}`}> {/**/}
						<div className='flex justify-center items-center w-full md:w-1/2 overflow-hidden'
							style={{
								backgroundImage: `url('https://thunderinsights.dk/images/flags/${vehicle.OperatorCountry}.avif')`,
								backgroundSize: 'cover',
								backgroundRepeat: 'no-repeat',
								backgroundPosition: 'center'
							}}
						>
							<img src={`https://thunderinsights.dk/images/vehicles/${vehicle.VehicleIdentifiyingName.toLowerCase()}.avif`} /> 
						</div>
						<p className='flex flex-col justify-center text-center md:text-right w-full md:w-auto'>
							<strong>{vehicle.VehicleName.replace(/[^\w\s()"()-]/g, '')}</strong>
							<span>BR: {vehicle.Battlerating} (Rank: {vehicle.Tier})</span>
						</p>
					</li>
					))}
				</ul>
			</section>
		</main>
	);
};
export default Home;
