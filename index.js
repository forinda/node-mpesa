const { AxiosError } = require('axios');
const dotenv = require('dotenv');
const axios = require('axios');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
dotenv.config();

const { PORT,MPESA_CONSUMER_KEY,MPESA_CONSUMER_SECRET,MPESA_PAYBILL,MPESA_PASSKEY } = process.env;


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin: '*', credentials: true}));
app.use(morgan('dev'));
app.get('/', (req, res) => {
    res.send('Hello World!');
    }
);

const generateTimestamp = () => {
    const date = new Date();
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hour = date.getHours();
	const minute = date.getMinutes();
	const second = date.getSeconds();
	const timestamp = `${year}${month < 10 ? '0' + month : month}${
		day < 10 ? '0' + day : day
	}${hour < 10 ? '0' + hour : hour}${minute < 10 ? '0' + minute : minute}${
		second < 10 ? '0' + second : second
	}`;

	return timestamp;
};
const generateMpesaToken = async (req, res,next) => {
    const mpesaAuthUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    try {
        const response = await axios.get(mpesaAuthUrl, {
            headers: {
                'Authorization': `Basic ${auth}`
            }});
            res.mpesa_token = response.data.access_token;
            return next();
    } catch (error) {
        if(error instanceof AxiosError){
            return res.status(error.response.status).json(error.response.data);
        }
    }

}
app.get('/access_token', generateMpesaToken, (req, res) => {
    const { mpesa_token } = res;
    return res.status(200).json({ mpesa_token });
});

app.post('/stk',generateMpesaToken,async(req,res,next)=>{
    const {phone,amount} = req.body;
    if (!phone || !amount) {
        return res.status(400).json({ message: 'Phone and amount are required' });
    }
    const timestamp = generateTimestamp();
    const password = Buffer.from(`${MPESA_PAYBILL}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const stkUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    try {
        const response = await axios.post(stkUrl, {
            "BusinessShortCode": MPESA_PAYBILL,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": MPESA_PAYBILL,
            "PhoneNumber": phone,
            "CallBackURL": "https://27e8-197-232-61-240.in.ngrok.io/stk_callback",
            "AccountReference": "Test",
            "TransactionDesc": "Test"
        }, {
            headers: {
                'Authorization': `Bearer ${res.mpesa_token}`
            }});    
            return res.status(200).json(response.data);
    } catch (error) {
        if(error instanceof AxiosError){
            return res.status(error.response.status).json(error.response.data);
        }
    }

})

app.post('/stk_callback', (req, res) => {
    console.log(req.body);
    return res.status(200).json({ message: 'success' });
});
app.get('/stk_callback', (req, res) => {
    console.log("STK Callback");
    return res.status(200).json({ message: 'STK Callback' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}
);