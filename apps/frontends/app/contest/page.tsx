"use client";

import react from "react";
import {contestApi} from "../../lib/api";
import {useState, useEffect} from "react";

function ContestPage() {
    const [contests, setContests] = useState([]);
    useEffect(()=>{
        const fetchContests = async()=>{
            try{
                const data = await contestApi.getContests();
                console.log("Contests data:", data);
                setContests(data.contests);
            }
            catch(err){
                console.error(err);
            }

        }
        fetchContests();
    },[]);
       

    return(
        <div>
            <h1>Contest Page</h1>
            {contests.map((contest: any) => (
                <div key={contest.id}>
                    <h2>{contest.name}</h2>
                    <p>{contest.description}</p>
                </div>
            ))}
        </div>
    )
}


export default ContestPage;