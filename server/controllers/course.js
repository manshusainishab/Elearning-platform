import { Courses } from '../models/Courses.js'
import { Lecture } from '../models/Lecture.js'
import { User } from '../models/User.js'


export const getAllCourses = async (req,res)=>{
    try{
        const courses = await Courses.find();
        res.json({
            courses,
        })
    }catch(err){
        res.status(500).send(err);
    }
}

export const getSingleCourse = async (req,res)=>{
    try{
        const course = await Courses.findById(req.params.id);
        res.json({
            course,
        })
    }catch(err){
        res.status(500).send(err);
    }
}

export const fetchLectures = async (req,res)=>{
    try{
        const lectures = await Lecture.find({course: req.params.id});
        const user = await User.findById(req.user._id);

        if (user.role === "admin"){
            return res.json({ lectures })
        }
        if (!user.subscription.includes(req.params.id)){
            return res.status(400).json({
                message: "you have not subscribed to this course"
            })
        }

        res.json({ lectures });
    }catch(err){
        res.status(500).send(err);
    }
}

export const fetchLecture = async (req,res)=>{
    try{
        const lecture = await Lecture.findById(req.params.id);
        const user = await User.findById(req.user._id);

        if (user.role === "admin"){
            return res.json({ lecture })
        }
        if (!user.subscription.includes(req.params.id)){
            return res.status(400).json({
                message: "you have not subscribed to this course"
            })
        }

        res.json({ lecture });
    }catch(err){
        res.status(500).send(err);
    }
}


export const getMyCourses = async (req,res)=>{
    const courses = await Courses.find({_id: req.user.subscription});

    res.json({
        courses,
    })
}