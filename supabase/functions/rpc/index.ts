import { verifyTypedData } from 'https://cdn.skypack.dev/@ethersproject/wallet?dts';
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

import { corsHeaders } from '../_shared/corsHeaders.ts';
import { supabaseClient } from '../_shared/supabaseClient.ts';

const domain = {
  name: 'ENS Grants',
  version: '1',
  chainId: 1,
};

const types = {
  Grant: [
    { name: 'address', type: 'address' },
    { name: 'roundId', type: 'uint256' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'fullText', type: 'string' },
  ],
};

const roundTypes = {
  Grant: [
    { name: 'address', type: 'address' },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'allocation_token_address', type: 'address' },
    { name: 'allocation_token_amount', type: 'uint256' },
    { name: 'max_winner_count', type: 'uint64' },
    { name: 'proposal_start', type: 'string' },
    { name: 'proposal_end', type: 'string' },
    { name: 'voting_start', type: 'string' },
    { name: 'voting_end', type: 'string' },
  ],
};

// temporary, hardcoded "admins" for web2 service
const adminAddresses = new Set(['0x9B6568d72A6f6269049Fac3998d1fadf1E6263cc'].map(x => x.toLowerCase()));

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { method, ...body } = await req.json();

  switch (method) {
    case 'create_round': {
      const { roundData, signature } = body;

      const recoveredAddress = verifyTypedData(domain, roundTypes, roundData, signature);

      const address = recoveredAddress.toLowerCase();

      if (address !== roundData.address) {
        return new Response(JSON.stringify({ message: 'invalid signature' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      if (!adminAddresses.has(address)) {
        return new Response(JSON.stringify({ message: 'not an admin' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const { data, error } = await supabaseClient.from('rounds').insert([
        {
          title: roundData.title,
          description: roundData.description,
          creator: roundData.address,
          allocation_token_address: roundData.allocation_token_address,
          allocation_token_amount: roundData.allocation_token_amount,
          max_winner_count: roundData.max_winner_count,
          proposal_start: Number.parseInt(roundData.proposal_start),
          proposal_end: Number.parseInt(roundData.proposal_end),
          voting_start: Number.parseInt(roundData.voting_start),
          voting_end: Number.parseInt(roundData.voting_end),
        },
      ]);

      if (error) {
        return new Response(JSON.stringify(error), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    case 'create_grant': {
      const { grantData, signature } = body;

      const recoveredAddress = verifyTypedData(domain, types, grantData, signature);

      const address = recoveredAddress.toLowerCase();

      if (address !== grantData.address) {
        return new Response(JSON.stringify({ message: 'invalid signature' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const { data: rounds, error } = await supabaseClient.from('rounds').select().eq('id', grantData.roundId);

      if (error) {
        return new Response(JSON.stringify(error), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (rounds.length !== 1) {
        return new Response(JSON.stringify({ message: 'could not find round' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseClient.from('grants').update({ deleted: true }).eq('proposer', address);

      const { data, error: grantError } = await supabaseClient.from('grants').insert([
        {
          round_id: grantData.roundId,
          proposer: address,
          title: grantData.title,
          description: grantData.description,
          full_text: grantData.fullText,
        },
      ]);

      if (grantError) {
        return new Response(JSON.stringify(grantError), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    default: {
      return new Response('not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});
