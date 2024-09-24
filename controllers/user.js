import { User } from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sendMail from '../middlewares/sendMail.js';


export const register = async(req,res)=>{
    try{
        const {name,email,password} = req.body;

        let user = await User.findOne({email});

        if (user)
            return res.status(400).json({message: "user Already exists"});

            const hashPassword = await bcrypt.hash(password,10);

            user = {
                name,email,password: hashPassword
            };

            const otp = Math.floor(Math.random()* 1000000);

            const activationToken = jwt.sign({
                user,
                otp,
            },process.env.Activation_Secret,{
                expiresIn: "5m"
            })

            const data = {
                name,
                otp,
            };

            await sendMail(
                email,
                "E learning",
                data
            )

            res.status(200).json({
                message: "OTP SEND TO YOUR MAIL",
                activationToken
            })
        
    }catch(err){
        res.status(500).json(
            {message : err.message}
        );
    }
};

export const verifyUser = async(req,res)=>{
    try{
        const {otp,activationToken} = req.body;

        const verify= jwt.verify(activationToken, process.env.Activation_Secret);

        if(!verify){
            return res.status(400).json({
                message: "Otp expired"
            })
        }

        if (verify.otp !== otp){
            return res.status(400).json({
                message: "Wrong Otp"
            })
        }

        await User.create({
            name: verify.user.name,
            email: verify.user.email,
            password: verify.user.password,
        })

        res.json({
            message: "User Registered"
        })

    }catch(err){
        res.status(500).json(
            {message : err.message}
        );
    }
}

export const loginUser = async(req,res)=>{
    try{
        const {email, password} = req.body;

        const user = await User.findOne({email})

        if (!user) return res.status(400).json({message: "No user with this email"});

        const matchPassword = await bcrypt.compare(password, user.password);

        if (!matchPassword) return res.status(400).json({message: "password is incorrect"});

        const token = await jwt.sign({_id: user._id}, process.env.Jwt_Secret,{
            expiresIn: "15d"
        })

        res.json({
            message: `Welcome back ${user.name}`,
            token,
            user
        })

    }catch(err){
        res.status(500).json(
            {message : err.message}
        );
    }
}